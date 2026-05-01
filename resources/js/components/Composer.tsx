import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

interface Props {
    onSend: (text: string) => void | Promise<void>;
    onStop: () => void;
    isStreaming: boolean;
    error: Error | null;
}

export function Composer({ onSend, onStop, isStreaming, error }: Props) {
    const [draft, setDraft] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const submit = async (e?: FormEvent) => {
        e?.preventDefault();
        const text = draft.trim();
        if (text === '' || isStreaming) {
            return;
        }
        setDraft('');
        await onSend(text);
        inputRef.current?.focus();
    };

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void submit();
        }
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-2">
            {error !== null && (
                <div
                    role="alert"
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                    data-testid="composer-error"
                >
                    {error.message}
                </div>
            )}
            <div className="flex items-end gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 shadow-sm focus-within:border-zinc-400">
                <textarea
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    rows={1}
                    placeholder="Scrivi un messaggio…"
                    disabled={isStreaming}
                    data-testid="composer-input"
                    className="max-h-40 min-h-[24px] flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-zinc-400 disabled:opacity-60"
                />
                {isStreaming ? (
                    <button
                        type="button"
                        onClick={onStop}
                        data-testid="composer-stop"
                        className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800"
                    >
                        Stop
                    </button>
                ) : (
                    <button
                        type="submit"
                        disabled={draft.trim() === ''}
                        data-testid="composer-send"
                        className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:bg-zinc-300"
                    >
                        Send
                    </button>
                )}
            </div>
        </form>
    );
}
