interface Props {
    onPick: (text: string) => void;
}

const PROMPTS: Array<{ icon: string; label: string; text: string }> = [
    {
        icon: '🖼️',
        label: 'Foto del Colosseo',
        text: 'Mostrami una foto del Colosseo al tramonto',
    },
    {
        icon: '📄',
        label: 'Documento NDA',
        text: 'Dammi un documento di esempio con un NDA breve',
    },
    {
        icon: '🔗',
        label: 'Link su Regolo',
        text: 'Linkami le risorse principali su Regolo.ai',
    },
    {
        icon: '💻',
        label: 'Snippet PHP',
        text: 'Mostrami uno snippet PHP che usa laravel/ai con Regolo',
    },
    {
        icon: '📊',
        label: 'Tabella modelli',
        text: 'Tabella dei top 5 modelli del catalogo Regolo',
    },
];

export function SuggestedPrompts({ onPick }: Props) {
    return (
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            {PROMPTS.map((p) => (
                <button
                    key={p.text}
                    type="button"
                    onClick={() => onPick(p.text)}
                    data-testid={`suggested-prompt-${p.label.toLowerCase().replace(/\s+/g, '-')}`}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                    <span className="mr-2">{p.icon}</span>
                    <span className="font-medium">{p.label}</span>
                    <div className="mt-1 truncate text-xs text-zinc-500">{p.text}</div>
                </button>
            ))}
        </div>
    );
}
