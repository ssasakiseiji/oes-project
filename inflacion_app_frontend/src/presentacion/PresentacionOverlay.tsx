import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { ChevronLeft, ChevronRight, Download, Maximize, Minimize, X } from 'lucide-react';
import { slides } from './slides';
import './impresion.css';

// Presentación a pantalla completa. Es `fixed inset-0`, así que escapa del
// contenedor max-w-[1800px] de DashboardPage y tapa header y sidebar sin
// tener que montarse más arriba en el árbol.
//
// Dos "pantallas completas" distintas conviven acá y conviene no confundirlas:
//   - el overlay (este div) tapa la APP;
//   - la Fullscreen API (botón ⛶) tapa el NAVEGADOR, sacando la barra de
//     direcciones. Para proyectar querés las dos.
export function PresentacionOverlay({ onClose }: { onClose: () => void }) {
    const [indice, setIndice] = useState(0);
    const [enFullscreen, setEnFullscreen] = useState(false);

    const ultima = slides.length - 1;
    // Sin wrap-around: en un proyector, saltar de la última a la primera por
    // apretar → de más se lee como que la presentación se reinició.
    const avanzar = () => setIndice(i => Math.min(i + 1, ultima));
    const retroceder = () => setIndice(i => Math.max(i - 1, 0));

    // El overlay ocupa el viewport entero; si el body sigue scrolleando detrás,
    // la rueda del mouse mueve el panel admin que quedó tapado.
    useEffect(() => {
        const anterior = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = anterior;
        };
    }, []);

    // El estado de fullscreen se sincroniza por evento y no por el click:
    // el navegador también sale de fullscreen por su cuenta (Esc, F11), y ahí
    // el ícono tiene que acompañar. Al desmontar se sale, para no dejar la
    // página trabada en fullscreen después de cerrar la presentación.
    useEffect(() => {
        const alCambiar = () => setEnFullscreen(document.fullscreenElement !== null);
        document.addEventListener('fullscreenchange', alCambiar);
        return () => {
            document.removeEventListener('fullscreenchange', alCambiar);
            if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        };
    }, []);

    const alternarFullscreen = () => {
        if (document.fullscreenElement) {
            void document.exitFullscreen().catch(() => {});
        } else {
            // Puede rechazar si el navegador no lo permite en este contexto;
            // no es un error que valga la pena mostrarle a nadie en vivo.
            void document.documentElement.requestFullscreen().catch(() => {});
        }
    };

    // Los setState son funcionales, así que los handlers no capturan estado
    // viejo y no hace falta pasarle deps a useHotkeys.
    useHotkeys('right, space, pagedown, down', e => {
        e.preventDefault();
        avanzar();
    });
    useHotkeys('left, pageup, up', e => {
        e.preventDefault();
        retroceder();
    });
    useHotkeys('home', () => setIndice(0));
    useHotkeys('end', () => setIndice(ultima));
    // Estando en fullscreen del navegador, el primer Esc lo consume el
    // navegador para salir; el segundo llega acá y cierra.
    useHotkeys('escape', () => {
        if (!document.fullscreenElement) onClose();
    });

    const SlideActual = slides[indice];

    return (
        <div
            className="fixed inset-0 z-[100] bg-bg text-ink flex flex-col animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label="Presentación"
        >
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
                <button
                    onClick={() => window.print()}
                    className="btn btn-icon btn-ghost rounded-full"
                    aria-label="Descargar en PDF"
                    title="Descargar en PDF"
                >
                    <Download size={18} />
                </button>
                <button
                    onClick={alternarFullscreen}
                    className="btn btn-icon btn-ghost rounded-full"
                    aria-label={enFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                >
                    {enFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
                <button
                    onClick={onClose}
                    className="btn btn-icon btn-ghost rounded-full"
                    aria-label="Cerrar presentación"
                >
                    <X size={18} />
                </button>
            </div>

            <button
                onClick={retroceder}
                disabled={indice === 0}
                className="btn btn-icon btn-ghost rounded-full absolute left-3 top-1/2 -translate-y-1/2 z-10 disabled:opacity-0"
                aria-label="Diapositiva anterior"
            >
                <ChevronLeft size={24} />
            </button>
            <button
                onClick={avanzar}
                disabled={indice === ultima}
                className="btn btn-icon btn-ghost rounded-full absolute right-3 top-1/2 -translate-y-1/2 z-10 disabled:opacity-0"
                aria-label="Diapositiva siguiente"
            >
                <ChevronRight size={24} />
            </button>

            {/* key={indice} remonta el subárbol en cada cambio, que es lo que
                vuelve a disparar animate-fade-in sin manejar la animación a mano */}
            <div key={indice} className="flex-grow min-h-0 overflow-y-auto animate-fade-in">
                <SlideActual />
            </div>

            {/* Puntos y contador juntos a la izquierda, la ayuda de teclado a la
                derecha: en dev, el bubble de las devtools de React Query se
                planta en la esquina inferior derecha y tapa lo que haya ahí.
                Que tape la ayuda (prescindible) y no el contador. */}
            <div className="shrink-0 flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        {slides.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setIndice(i)}
                                className={`h-2 w-2 rounded-full transition-colors ${
                                    i === indice ? 'bg-accent' : 'bg-ink/25 hover:bg-ink/50'
                                }`}
                                aria-label={`Ir a la diapositiva ${i + 1}`}
                                aria-current={i === indice}
                            />
                        ))}
                    </div>

                    <p className="text-muted text-sm tabular-nums">
                        {indice + 1} / {slides.length}
                    </p>
                </div>

                <p className="text-muted text-xs hidden sm:block">
                    ← → navegar · Esc salir
                </p>
            </div>

            {/* Versión imprimible: TODAS las diapositivas apiladas, una por
                página. Va en un portal sobre <body> y no acá adentro porque en
                impresión se oculta #root entero (ver impresion.css) -- si
                colgara del overlay, se ocultaría con él. Invisible en pantalla. */}
            {createPortal(
                <div className="presentacion-impresion" aria-hidden>
                    {slides.map((Diapositiva, i) => (
                        <div key={i} className="presentacion-impresion-pagina">
                            <Diapositiva />
                        </div>
                    ))}
                </div>,
                document.body,
            )}
        </div>
    );
}
