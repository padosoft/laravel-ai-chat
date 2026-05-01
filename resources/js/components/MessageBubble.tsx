import type { UIMessage } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { renderArtifact, tryParseArtifact } from './artifacts';

interface Props {
    message: UIMessage;
}

export function MessageBubble({ message }: Props) {
    const isUser = message.role === 'user';

    return (
        <div
            className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
            data-testid={`message-${message.id}`}
            data-role={message.role}
        >
            <div className="px-1 text-[11px] uppercase tracking-wider text-zinc-400">
                {isUser ? 'You' : 'AI'}
            </div>
            <div
                className={
                    isUser
                        ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 px-4 py-2.5 text-sm text-white shadow-sm'
                        : 'max-w-[90%] rounded-2xl rounded-bl-sm border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm'
                }
            >
                {message.parts.map((part, idx) => {
                    // Plain text — render as Markdown for the assistant,
                    // verbatim for the user (to avoid surprising
                    // markdown rendering of user input).
                    if (part.type === 'text') {
                        return isUser ? (
                            <div key={idx} className="whitespace-pre-wrap">
                                {(part as { text: string }).text}
                            </div>
                        ) : (
                            <div key={idx} className="prose prose-sm prose-zinc max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {(part as { text: string }).text}
                                </ReactMarkdown>
                            </div>
                        );
                    }

                    // Tool calls — match `tool-XXX` parts that have an
                    // available output. The output is a JSON string
                    // emitted by our App\Ai\Tools\* handlers, so we
                    // parse and dispatch via the `__artifact` tag.
                    if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
                        const p = part as {
                            type: string;
                            state?: string;
                            output?: unknown;
                        };
                        if (p.state !== 'output-available' && p.state !== 'result') {
                            return (
                                <div
                                    key={idx}
                                    className="my-2 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500"
                                >
                                    Calling tool <code>{part.type}</code>…
                                </div>
                            );
                        }
                        const payload = tryParseArtifact(p.output);
                        if (payload === null) {
                            return null;
                        }
                        return <div key={idx}>{renderArtifact(payload)}</div>;
                    }

                    return null;
                })}
            </div>
        </div>
    );
}
