import type { ReactNode } from 'react';

export interface ChartTooltipRow {
    label: string;
    value: string;
    /** Muestra del color de la serie. Solo cuando hay más de una. */
    swatch?: string;
}

export interface ChartTooltipBoxProps {
    title: ReactNode;
    rows: ChartTooltipRow[];
    footnote?: ReactNode;
}

/*
 * Caja del tooltip de todos los gráficos.
 *
 * Estilo inline y no la clase .card a propósito: dentro de .admin-surface las
 * cards hijas pierden fondo (ver nocturne.css), y un tooltip transparente
 * sobre el plot es ilegible. Acá el fondo opaco es obligatorio.
 */
export const ChartTooltipBox = ({ title, rows, footnote }: ChartTooltipBoxProps) => (
    <div
        className="rounded-[var(--nc-radius-md)] px-3 py-2 text-xs"
        style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            boxShadow: 'var(--nc-shadow-md)',
        }}
    >
        <p className="text-ink font-medium">{title}</p>
        <ul className="mt-1 space-y-0.5">
            {rows.map(row => (
                <li key={row.label} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-muted">
                        {row.swatch && (
                            <span
                                className="inline-block size-2 rounded-[2px] shrink-0"
                                style={{ background: row.swatch }}
                                aria-hidden="true"
                            />
                        )}
                        {row.label}
                    </span>
                    <span className="text-ink tabular-nums">{row.value}</span>
                </li>
            ))}
        </ul>
        {footnote && <p className="text-muted mt-1.5">{footnote}</p>}
    </div>
);
