import type { ReactNode } from 'react';

// Número grande + etiqueta. `tono` existe porque en Nocturne el verde y el
// rojo codifican significado (subió/bajó, ok/error), no decoración -- ver el
// header de nocturne.css. Usar 'exito'/'peligro' solo cuando el número
// realmente signifique eso.
const TONOS = {
    neutro: 'text-accent',
    exito: 'text-success',
    peligro: 'text-danger',
} as const;

export function Stat({
    valor,
    etiqueta,
    detalle,
    tono = 'neutro',
    className = '',
}: {
    valor: ReactNode;
    etiqueta: ReactNode;
    detalle?: ReactNode;
    tono?: keyof typeof TONOS;
    className?: string;
}) {
    return (
        <div className={className}>
            <p
                className={`${TONOS[tono]} font-semibold tracking-tight leading-none tabular-nums text-[clamp(2.25rem,5.5vw,4.5rem)]`}
            >
                {valor}
            </p>
            <p className="text-ink/75 mt-[0.5em] leading-snug text-[clamp(0.9rem,1.4vw,1.25rem)]">
                {etiqueta}
            </p>
            {detalle && (
                <p className="text-muted mt-1 leading-snug text-[clamp(0.75rem,1.05vw,1rem)]">
                    {detalle}
                </p>
            )}
        </div>
    );
}
