import type { ReactNode } from 'react';

// Los items son ReactNode y no string a propósito: así se puede resaltar una
// palabra suelta (<strong className="text-accent">) sin cambiar de componente.
export function Bullets({
    items,
    className = '',
}: {
    items: ReactNode[];
    className?: string;
}) {
    return (
        <ul className={`flex flex-col gap-[clamp(0.6rem,1.7vh,1.2rem)] ${className}`}>
            {items.map((item, i) => (
                <li
                    key={i}
                    className="flex items-start gap-[0.8em] text-ink leading-snug text-[clamp(1.05rem,1.9vw,1.65rem)]"
                >
                    {/* Viñeta dimensionada en em: escala junto con el texto */}
                    <span
                        aria-hidden
                        className="mt-[0.6em] h-[0.28em] w-[0.28em] shrink-0 rounded-full bg-accent/70"
                    />
                    <span className="text-pretty">{item}</span>
                </li>
            ))}
        </ul>
    );
}
