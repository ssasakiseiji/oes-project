import type { ReactNode } from 'react';

// Marco común de toda diapositiva. No lleva card ni .admin-surface a
// propósito: la presentación se lee directo contra --color-bg, mismo trato
// que el login y el aviso de "Se necesita más ancho" (AdminDashboard.tsx).
// Una superficie acá solo agregaría un rectángulo dentro de otro.
//
// El contenido se centra vertical y horizontalmente en un ancho máximo
// generoso: proyectado, una línea que cruza toda la pantalla no se lee.
export function Slide({
    kicker,
    children,
    className = '',
}: {
    kicker?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        // Dos niveles a propósito: el padding va en el <section> (que ocupa todo
        // el ancho) y el tope de ancho en el <div> de adentro. Si van juntos, el
        // padding se come el max-w y en una pantalla ancha el contenido queda
        // encajonado en el centro con tres columnas apretadas.
        <section className="w-full h-full flex items-center justify-center px-[5vw] py-[5vh]">
            <div className={`w-full max-w-[1500px] ${className}`}>
                {kicker && (
                    // Mismo tratamiento que .card-kicker en nocturne.css (uppercase,
                    // tracking abierto, --color-accent), pero escalado para proyector.
                    <p className="text-accent uppercase tracking-[0.18em] font-medium text-[clamp(0.7rem,1vw,0.95rem)] mb-[clamp(1rem,2.5vh,2rem)]">
                        {kicker}
                    </p>
                )}
                <div className="flex flex-col gap-[clamp(1.25rem,3vh,2.25rem)]">{children}</div>
            </div>
        </section>
    );
}
