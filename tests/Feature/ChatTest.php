<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatTest extends TestCase
{
    use RefreshDatabase;

    public function test_homepage_serves_the_spa_shell(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
        $response->assertSee('id="app"', false);
        $response->assertSee('csrf-token', false);
    }

    public function test_conversations_endpoint_returns_empty_array_for_a_fresh_session(): void
    {
        $response = $this->getJson('/api/conversations');

        $response->assertStatus(200);
        $response->assertExactJson([]);
    }

    public function test_conversations_endpoint_filters_by_session_id(): void
    {
        // Pin a known session by constructing an in-memory Store with
        // a fixed id and handing it to the request. The HTTP test
        // client doesn't preserve session cookies under the array
        // driver, so we drive the controller directly here.
        // Laravel's Store::setId silently regenerates the id if it
        // doesn't match isValidId (40-char alphanumeric). Use the
        // helper to avoid that trap.
        $sessionId = (new \Illuminate\Session\Store(
            'probe',
            new \Illuminate\Session\ArraySessionHandler(120),
        ))->getId();
        $store = new \Illuminate\Session\Store(
            'test',
            new \Illuminate\Session\ArraySessionHandler(120),
            $sessionId,
        );

        $mine = Conversation::create([
            'session_id' => $sessionId,
            'title'      => 'My chat',
        ]);
        $mine->messages()->createMany([
            ['role' => 'user',      'content' => 'Hello'],
            ['role' => 'assistant', 'content' => 'Hi from Regolo.', 'artifacts' => [['__artifact' => 'image']]],
        ]);

        Conversation::create([
            'session_id' => 'unrelated-session',
            'title'      => 'Other chat',
        ]);

        $request = \Illuminate\Http\Request::create('/api/conversations', 'GET');
        $request->setLaravelSession($store);
        $this->assertSame($sessionId, $request->session()->getId());

        $response = (new \App\Http\Controllers\ChatStreamController())->index($request);

        $this->assertSame(200, $response->status());

        $payload = $response->getData(true);
        $this->assertCount(1, $payload);
        $this->assertSame('My chat', $payload[0]['title']);
        $this->assertSame('assistant', $payload[0]['messages'][1]['role']);
        $this->assertSame('image', $payload[0]['messages'][1]['artifacts'][0]['__artifact']);
    }

    public function test_chat_stream_endpoint_validates_input(): void
    {
        $response = $this->postJson('/api/chat/stream', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('content');
    }

    public function test_chat_stream_endpoint_persists_the_user_message_before_streaming(): void
    {
        // We do NOT actually exercise the LLM call here — `padosoft/
        // laravel-ai-regolo` requires a network call to api.regolo.ai
        // which we intentionally skip. Instead we wrap the call so the
        // exception that would be thrown by the Http facade in test
        // mode (no Http::fake = ConnectionException) is caught, and
        // assert the side-effect that should have happened BEFORE the
        // stream attempt: the user message is persisted and a
        // conversation row is created with the session id.
        try {
            $this->post('/api/chat/stream', ['content' => 'Ciao Regolo!'])->getContent();
        } catch (\Throwable) {
            // Swallow: we only care about the pre-stream side effects.
        }

        $sessionId = $this->app['session']->getId();
        $conversation = Conversation::query()->where('session_id', $sessionId)->first();

        $this->assertNotNull($conversation, 'conversation was not created');
        $this->assertSame('Ciao Regolo!', $conversation->title);

        $message = Message::query()->where('conversation_id', $conversation->id)->first();
        $this->assertNotNull($message, 'user message was not persisted');
        $this->assertSame('user', $message->role);
        $this->assertSame('Ciao Regolo!', $message->content);
    }
}
