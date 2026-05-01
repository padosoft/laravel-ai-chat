<?php

use App\Http\Controllers\ChatStreamController;
use Illuminate\Support\Facades\Route;

// Streaming chat endpoint (Vercel AI SDK protocol).
Route::post('/api/chat/stream', [ChatStreamController::class, 'store'])
    ->name('chat.stream');

// List the current session's conversation history.
Route::get('/api/conversations', [ChatStreamController::class, 'index'])
    ->name('chat.conversations');

// SPA — single page, the React app handles client-side routing.
// `where('any', '.*')` makes this the catch-all so deep links work.
Route::get('/{any?}', fn () => view('app'))->where('any', '.*');
