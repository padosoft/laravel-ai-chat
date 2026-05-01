interface Props {
    topic: string;
    links: Array<{ title: string; url: string; description: string }>;
}

export function LinkArtifact({ links }: Props) {
    return (
        <div className="my-2 flex flex-col gap-2" data-testid="artifact-links">
            {links.map((l) => (
                <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-zinc-200 bg-white p-3 transition hover:bg-zinc-50"
                >
                    <div className="flex items-center gap-2">
                        <img
                            src={`https://www.google.com/s2/favicons?domain=${new URL(l.url).hostname}&sz=32`}
                            alt=""
                            className="h-4 w-4 shrink-0"
                            loading="lazy"
                        />
                        <span className="truncate text-sm font-medium text-zinc-900">{l.title}</span>
                    </div>
                    <div className="mt-1 truncate font-mono text-[11px] text-zinc-500">{l.url}</div>
                    <div className="mt-1 text-xs text-zinc-600">{l.description}</div>
                </a>
            ))}
        </div>
    );
}
