import { useState } from 'react';

interface Props {
    language: string;
    code: string;
    topic: string;
}

export function CodeArtifact({ language, code }: Props) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Some browsers block clipboard in insecure contexts; the
            // demo simply skips the toast.
        }
    };

    return (
        <div
            className="my-2 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-900 text-zinc-100"
            data-testid="artifact-code"
        >
            <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5 text-[11px]">
                <span className="font-mono uppercase tracking-wider text-zinc-400">{language}</span>
                <button
                    type="button"
                    onClick={copy}
                    className="rounded px-2 py-0.5 font-medium text-zinc-300 transition hover:bg-zinc-800"
                >
                    {copied ? 'Copied ✓' : 'Copy'}
                </button>
            </div>
            <pre className="overflow-x-auto px-3 py-3 font-mono text-xs leading-relaxed">
                <code>{code}</code>
            </pre>
        </div>
    );
}
