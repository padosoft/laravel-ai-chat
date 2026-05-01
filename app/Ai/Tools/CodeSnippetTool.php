<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request as ToolRequest;

class CodeSnippetTool implements Tool
{
    public function description(): string
    {
        return 'Show a syntax-highlighted code snippet artifact. Call this when the user asks for a code example, snippet, sample, or "how do I do X in <language>".';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'language' => $schema->string()->required()
                ->description('Programming language tag (e.g. "php", "ts", "bash", "json").'),
            'topic'    => $schema->string()->required()
                ->description('Short topic the snippet should illustrate.'),
        ];
    }

    public function handle(ToolRequest $request): string
    {
        $language = strtolower((string) ($request['language'] ?? 'php'));
        $topic = (string) ($request['topic'] ?? 'laravel/ai usage');

        $code = match ($language) {
            'php' => <<<PHP
            // {$topic}
            use Laravel\\Ai\\AnonymousAgent;

            \$agent = new AnonymousAgent(
                instructions: 'You are a helpful demo assistant.',
                messages: [],
                tools: [new ShowImageTool, new ShowDocTool],
            );

            return \$agent->stream('Show me Rome.', provider: 'regolo')
                ->usingVercelDataProtocol();
            PHP,
            'ts', 'tsx', 'typescript' => <<<TS
            // {$topic}
            import { useChat } from '@ai-sdk/react';
            import { DefaultChatTransport } from 'ai';

            const transport = new DefaultChatTransport({
                api: '/api/chat/stream',
                credentials: 'same-origin',
            });

            export function Chat() {
                const { messages, sendMessage } = useChat({ transport });
                return /* render messages.parts → text + tool artifacts */ null;
            }
            TS,
            'bash', 'sh' => <<<BASH
            # {$topic}
            composer require laravel/ai padosoft/laravel-ai-regolo
            php artisan vendor:publish --tag=ai-config
            echo 'REGOLO_API_KEY=rg_live_...' >> .env
            php artisan migrate
            php artisan serve
            BASH,
            default => "// {$topic}\n// Language '{$language}' not in demo catalog — try php / ts / bash.",
        };

        return (string) json_encode([
            '__artifact' => 'code',
            'language'   => $language,
            'topic'      => $topic,
            'code'       => $code,
        ]);
    }
}
