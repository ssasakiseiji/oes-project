import type { ReactNode } from 'react';

// Jerarquía por brillo, no por hue -- es la regla de Nocturne: --color-accent
// (#fafafa) es MÁS claro que --color-ink (#dedede), así que el titular va en
// accent, el cuerpo en ink y lo secundario en ink con alpha.

export function Titulo({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <h2
            className={`text-accent font-semibold tracking-tight leading-[1.08] text-[clamp(2.25rem,4.8vw,4.5rem)] text-balance ${className}`}
        >
            {children}
        </h2>
    );
}

export function Subtitulo({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <p className={`text-ink/70 leading-snug text-[clamp(1.05rem,1.9vw,1.7rem)] text-pretty ${className}`}>
            {children}
        </p>
    );
}

// Pie de diapositiva: fuentes, aclaraciones, atribuciones.
export function Nota({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <p className={`text-muted text-[clamp(0.75rem,1.05vw,1rem)] ${className}`}>{children}</p>
    );
}
