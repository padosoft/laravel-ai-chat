import { useEffect, useState } from 'react';
import { useChatStream } from './lib/use-chat-stream';
import { MessageThread } from './components/MessageThread';
import { Composer } from './components/Composer';
import { SuggestedPrompts } from './components/SuggestedPrompts';

export function ChatApp() {
    const [conversationId, setConversationId] = useState<number | null>(null);
    const chat = useChatStream(conversationId, (newId) => setConversationId(newId));

    const isStreaming = chat.status === 'submitted' || chat.status === 'streaming';
    const isEmpty = chat.messages.length === 0;

    // Suggested-prompt click → fire the message immediately.
    const sendText = async (text: string) => {
        await chat.sendMessage({ text });
    };

    // Hide the welcome screen the moment the user sends, even before the
    // first stream chunk arrives.
    useEffect(() => {
        if (isStreaming && isEmpty) {
            // no-op; the SDK populates messages synchronously on send.
        }
    }, [isStreaming, isEmpty]);

    return (
        <div className="flex h-full flex-col">
            <header className="border-b border-zinc-200 bg-white">
                <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
                    <div>
                        <div className="text-sm font-semibold">Laravel AI Chat — Demo</div>
                        <div className="font-mono text-[11px] text-zinc-500">
                            🇮🇹 powered by Regolo · Llama-3.3-70B-Instruct
                        </div>
                    </div>
                    <a
                        href="https://github.com/padosoft/laravel-ai-regolo"
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition hover:bg-zinc-50"
                    >
                        padosoft/laravel-ai-regolo ↗
                    </a>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto" data-testid="chat-main">
                {isEmpty ? (
                    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 px-6">
                        <div className="text-center">
                            <h1 className="text-3xl font-semibold tracking-tight">Cosa vuoi vedere oggi?</h1>
                            <p className="mt-2 text-sm text-zinc-500">
                                Prova un prompt sotto, oppure chiedi qualcosa di tuo.
                            </p>
                        </div>
                        <SuggestedPrompts onPick={sendText} />
                    </div>
                ) : (
                    <div className="mx-auto max-w-3xl px-4 py-6">
                        <MessageThread messages={chat.messages} isStreaming={isStreaming} />
                    </div>
                )}
            </main>

            <footer className="border-t border-zinc-200 bg-white">
                <div className="mx-auto max-w-3xl px-4 py-4">
                    <Composer
                        onSend={sendText}
                        onStop={chat.stop}
                        isStreaming={isStreaming}
                        error={chat.error ?? null}
                    />
                </div>
            </footer>
        </div>
    );
}
