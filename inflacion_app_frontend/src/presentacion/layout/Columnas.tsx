import type { ReactNode } from 'react';

// grid-cols-N no se puede armar por interpolación: Tailwind escanea el fuente
// como texto y `grid-cols-${n}` nunca generaría la clase. Por eso el mapa.
const COLUMNAS: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
};

export function Columnas({
    cantidad = 2,
    children,
    className = '',
}: {
    cantidad?: 2 | 3 | 4;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`grid ${COLUMNAS[cantidad]} gap-[clamp(1.25rem,3.5vw,3rem)] items-start ${className}`}
        >
            {children}
        </div>
    );
}

// Atajo para el caso más común (izquierda/derecha) cuando no querés pensar en
// children posicionales.
export function DosColumnas({
    izquierda,
    derecha,
    className = '',
}: {
    izquierda: ReactNode;
    derecha: ReactNode;
    className?: string;
}) {
    return (
        <Columnas cantidad={2} className={className}>
            <div>{izquierda}</div>
            <div>{derecha}</div>
        </Columnas>
    );
}
