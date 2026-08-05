import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { LOADING_FADE_MS, useDelayedLoading, type DelayedLoadingOptions } from '../../hooks/useDelayedLoading';

const HEIGHT_TRANSITION_MS = 280;

export interface LoadingAreaProps extends DelayedLoadingOptions {
    isLoading: boolean;
    /** Placeholder. Su alto es el que reserva el área desde el primer frame. */
    skeleton: ReactNode;
    children: ReactNode;
}

/*
 * El área de datos de un módulo, con su alto bajo control.
 *
 * Antes la carga pasaba por tres formas en menos de un segundo: el contenedor
 * dibujaba sólo su encabezado (durante la ventana de gracia el área de datos
 * era `null`, así que el panel colapsaba), después crecía de golpe al montar
 * el skeleton, y después volvía a saltar al llegar el contenido. Ese primer
 * colapso es el flash.
 *
 * Acá el skeleton se monta SIEMPRE mientras dura la carga -- durante la
 * ventana de gracia va en opacity 0, así que reserva su alto sin mostrarse --
 * y el único cambio de tamaño que queda (skeleton -> contenido) se anima:
 * el alto medido del contenido se aplica al contenedor, que transiciona hacia
 * él. Como el alto se fija arriba y el contenido crece hacia abajo, el borde
 * superior no se mueve nunca.
 *
 * Por qué no es CSS solo: `interpolate-size: allow-keywords` (soportado acá)
 * sirve para transicionar entre `auto` y un valor declarado, no para animar un
 * `auto` cuyo contenido cambió de tamaño -- que es exactamente este caso. De
 * ahí la medición con ResizeObserver.
 *
 * La transición de alto NO se apaga con `prefers-reduced-motion`, a diferencia
 * del shimmer de .skeleton: el shimmer es un bucle decorativo, mientras que
 * esto reemplaza un salto brusco por el mismo cambio hecho gradual. Apagarlo
 * devolvería el salto, que es el problema que el componente resuelve.
 */
export const LoadingArea = ({ isLoading, skeleton, children, delay, minDuration }: LoadingAreaProps) => {
    const showSkeleton = useDelayedLoading(isLoading, { delay, minDuration });
    const contentRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | null>(null);
    // Alto anterior, para saber si el próximo cambio es una animación real o
    // la primera medición. Va en ref porque se lee dentro del observer.
    const lastHeightRef = useRef<number | null>(null);
    // `overflow: hidden` sólo mientras el alto se mueve: dejarlo fijo
    // recortaría cualquier cosa que se desborde del área (menús o popovers que
    // no vayan a un portal) durante el resto de la vida del módulo.
    const [isResizing, setIsResizing] = useState(false);

    useLayoutEffect(() => {
        const el = contentRef.current;
        if (!el) return;

        const apply = (next: number) => {
            const previous = lastHeightRef.current;
            lastHeightRef.current = next;
            // Sub-píxel: los redondeos del layout no son un cambio de tamaño.
            if (previous !== null && Math.abs(previous - next) > 1) setIsResizing(true);
            setHeight(next);
        };

        // La primera medición se aplica antes del primer paint y coincide con
        // el alto que el elemento ya tenía en `auto`, así que no dispara la
        // transición: montar no anima.
        apply(el.getBoundingClientRect().height);

        const observer = new ResizeObserver(entries => apply(entries[0].contentRect.height));
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            style={{
                height: height ?? undefined,
                transition: `height ${HEIGHT_TRANSITION_MS}ms ease`,
                overflow: isResizing ? 'hidden' : undefined,
            }}
            onTransitionEnd={event => {
                if (event.propertyName === 'height') setIsResizing(false);
            }}
        >
            <div ref={contentRef}>
                {/* `|| showSkeleton` y no sólo `isLoading`: cuando la carga
                    termina antes del mínimo en pantalla, useDelayedLoading
                    mantiene showSkeleton en true un rato más y el placeholder
                    tiene que seguir puesto. Mirando sólo isLoading, el mínimo
                    no existía. */}
                {isLoading || showSkeleton ? (
                    <div
                        style={{
                            opacity: showSkeleton ? 1 : 0,
                            transition: `opacity ${LOADING_FADE_MS}ms ease`,
                        }}
                    >
                        {skeleton}
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
};
