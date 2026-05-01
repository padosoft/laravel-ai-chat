<?php

namespace App\Http\Controllers;

use App\Ai\Tools\CodeSnippetTool;
use App\Ai\Tools\DataTableTool;
use App\Ai\Tools\ListLinksTool;
use App\Ai\Tools\ShowDocTool;
use App\Ai\Tools\ShowImageTool;
use App\Models\Conversation;
use App\Models\Message as MessageModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Laravel\Ai\AnonymousAgent;
use Laravel\Ai\Responses\StreamedAgentResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Streaming chat endpoint.
 *
 * Wires the Vercel AI SDK frontend (`@ai-sdk/react`'s `useChat()`) to the
 * official `laravel/ai` SDK with `padosoft/laravel-ai-regolo` as the
 * default provider. The response is a `text/event-stream` whose payload
 * format is the Vercel AI SDK UI Message Stream protocol — emitted
 * automatically by `usingVercelDataProtocol()`.
 */
class ChatStreamController extends Controller
{
    /**
     * GET /api/conversations — list the current session's conversations
     * with their messages. The session id ties the thread to the
     * browser cookie; no auth is needed for the demo.
     */
    public function index(Request $request): JsonResponse
    {
        $sessionId = $request->session()->getId();

        $conversations = Conversation::query()
            ->where('session_id', $sessionId)
            ->orderByDesc('updated_at')
            ->with('messages:id,conversation_id,role,content,artifacts,created_at')
            ->get();

        return response()->json($conversations);
    }

    /**
     * POST /api/chat/stream — send a user message and stream the
     * assistant reply token-by-token in Vercel AI SDK protocol shape.
     */
    public function store(Request $request): Response
    {
        $validated = $request->validate([
            'content'         => ['required', 'string', 'max:4000'],
            'conversation_id' => ['nullable', 'integer', 'exists:conversations,id'],
        ]);

        $sessionId = $request->session()->getId();

        $conversation = isset($validated['conversation_id'])
            ? Conversation::query()
                ->where('session_id', $sessionId)
                ->findOrFail($validated['conversation_id'])
            : Conversation::create([
                'session_id' => $sessionId,
                'title'      => Str::limit($validated['content'], 60, '…'),
            ]);

        // Persist the user turn BEFORE the stream so a mid-stream
        // disconnect still leaves the user message in the thread.
        $conversation->messages()->create([
            'role'    => 'user',
            'content' => $validated['content'],
        ]);

        // Build conversation history for the LLM. The very last user
        // message (the new turn) goes to ->stream() as the prompt
        // parameter; all PRIOR turns become $messages.
        $allMessages = $conversation->messages()
            ->get(['role', 'content'])
            ->map(fn (MessageModel $m) => ['role' => $m->role, 'content' => $m->content])
            ->all();

        $latestUserMessage = end($allMessages)['content'];
        $priorMessages = array_slice($allMessages, 0, -1);

        $systemPrompt = view('prompts.system')->render();

        $agent = new AnonymousAgent(
            instructions: $systemPrompt,
            messages: $priorMessages,
            tools: [
                new ShowImageTool(),
                new ShowDocTool(),
                new ListLinksTool(),
                new CodeSnippetTool(),
                new DataTableTool(),
            ],
        );

        // Release the session lock before the long-lived stream so the
        // same browser session can issue concurrent reads (e.g. polling
        // the conversation list while the stream is still active).
        $request->session()->save();

        return $agent
            ->stream($latestUserMessage, provider: config('ai.default'))
            ->withinConversation((string) $conversation->id)
            ->usingVercelDataProtocol()
            ->then(function (StreamedAgentResponse $result) use ($conversation): void {
                // Collect tool-result payloads into the assistant
                // message's `artifacts` JSON column. The frontend
                // already gets them inline via the Vercel UI Message
                // Stream — this column is only used to repopulate the
                // thread on a refresh.
                $artifacts = collect($result->toolResults ?? [])
                    ->map(function ($toolResult) {
                        $raw = is_object($toolResult) && property_exists($toolResult, 'result')
                            ? $toolResult->result
                            : null;

                        if (! is_string($raw)) {
                            return null;
                        }

                        $decoded = json_decode($raw, true);

                        return is_array($decoded) ? $decoded : null;
                    })
                    ->filter()
                    ->values()
                    ->all();

                $conversation->messages()->create([
                    'role'      => 'assistant',
                    'content'   => $result->text ?? '',
                    'artifacts' => $artifacts !== [] ? $artifacts : null,
                ]);

                $conversation->touch();
            });
    }
}
