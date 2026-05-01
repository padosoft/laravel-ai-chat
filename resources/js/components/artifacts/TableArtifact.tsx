interface Props {
    columns: string[];
    rows: Array<Array<string | number>>;
}

export function TableArtifact({ columns, rows }: Props) {
    return (
        <div
            className="my-2 overflow-hidden rounded-xl border border-zinc-200 bg-white"
            data-testid="artifact-table"
        >
            <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500">
                    <tr>
                        {columns.map((c) => (
                            <th key={c} className="px-3 py-2 font-medium">
                                {c}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                    {rows.map((row, i) => (
                        <tr key={i}>
                            {row.map((cell, j) => (
                                <td
                                    key={j}
                                    className={`px-3 py-2 ${j === 0 ? 'font-mono text-[12px] text-zinc-900' : 'text-zinc-700'}`}
                                >
                                    {String(cell)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
