interface Props {
    title: string;
    mime: string;
    pages: number;
    snippet: string;
    fakeUrl: string;
}

export function DocArtifact({ title, mime, pages, snippet, fakeUrl }: Props) {
    return (
        <a
            href={fakeUrl}
            onClick={(e) => e.preventDefault()}
            className="my-2 block rounded-xl border border-zinc-200 bg-white p-3 transition hover:bg-zinc-50"
            data-testid="artifact-doc"
        >
            <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-red-50 text-2xl">
                    📄
                </div>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-zinc-900">{title}</div>
                    <div className="font-mono text-[11px] text-zinc-500">
                        {mime} · {pages} {pages === 1 ? 'page' : 'pages'}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-zinc-600">{snippet}</div>
                </div>
            </div>
        </a>
    );
}
