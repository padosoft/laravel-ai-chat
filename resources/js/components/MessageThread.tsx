import { useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { MessageBubble } from './MessageBubble';

interface Props {
    messages: UIMessage[];
    isStreaming: boolean;
}

export function MessageThread({ messages, isStreaming }: Props) {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to the bottom on every new chunk so the latest token
    // is always visible.
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, isStreaming]);

    return (
        <div className="flex flex-col gap-4" data-testid="message-thread">
            {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
            ))}
            {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
                    L'assistente sta pensando…
                </div>
            )}
            <div ref={bottomRef} />
        </div>
    );
}
