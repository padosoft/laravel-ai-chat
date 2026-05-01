interface Props {
    url: string;
    alt: string;
    caption?: string;
}

export function ImageArtifact({ url, alt, caption }: Props) {
    return (
        <figure
            className="my-2 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
            data-testid="artifact-image"
        >
            <img src={url} alt={alt} className="h-auto w-full" loading="lazy" />
            {caption !== undefined && caption !== '' && (
                <figcaption className="px-3 py-2 text-xs text-zinc-600">{caption}</figcaption>
            )}
        </figure>
    );
}
