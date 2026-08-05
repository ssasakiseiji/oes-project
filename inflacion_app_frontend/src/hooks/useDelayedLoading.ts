import { useEffect, useRef, useState } from 'react';

/*
 * Un skeleton que aparece y desaparece en 80ms es peor que no mostrar nada:
 * se lee como un parpadeo, no como "esto está cargando". Este hook le pone
 * las dos guardas que faltaban:
 *
 *   - `delay`: la carga tiene que durar al menos esto para que el skeleton
 *     llegue a montarse. Si la request vuelve antes, se pasa del estado vacío
 *     al contenido sin pantalla intermedia.
 *   - `minDuration`: una vez que se mostró, se queda al menos esto aunque los
 *     datos ya hayan llegado. Sin esto, una request de 260ms muestra el
 *     skeleton 10ms.
 *
 * Devuelve solo si el placeholder debe verse. El call site sigue necesitando
 * `isLoading` para distinguir la ventana de gracia (nada montado todavía) del
 * contenido real -- de ahí el patrón `if (isLoading || show) return show ? ...`
 * y el componente <LoadingArea>, que lo encapsula.
 */

export const LOADING_DELAY_MS = 250;

/*
 * El placeholder no aparece de golpe: entra con un fundido, porque un bloque
 * que se materializa de un frame al otro es el parpadeo que estamos sacando.
 * La constante vive acá y no en cada consumidor porque el mínimo de abajo se
 * calcula a partir de ella -- si el fundido cambia y el mínimo no, dejan de
 * cuadrar. La aplican <LoadingArea> y los dos paneles que reemplazan la vista
 * entera (StudentDashboard, MonitorDashboard).
 */
export const LOADING_FADE_MS = 140;

/** Cuánto se ve el placeholder a opacidad plena. Es el número con intención. */
export const LOADING_MIN_VISIBLE_MS = 500;

/*
 * Lo que el hook sostiene, que es lo anterior MÁS el fundido: durante esos
 * 140ms iniciales el placeholder está montado pero todavía translúcido, así
 * que contarlos como tiempo visible dejaba la ventana plena en ~360ms en vez
 * de los 500 buscados.
 */
export const LOADING_MIN_DURATION_MS = LOADING_FADE_MS + LOADING_MIN_VISIBLE_MS;

export interface DelayedLoadingOptions {
    delay?: number;
    minDuration?: number;
}

export function useDelayedLoading(
    isLoading: boolean,
    { delay = LOADING_DELAY_MS, minDuration = LOADING_MIN_DURATION_MS }: DelayedLoadingOptions = {}
): boolean {
    const [isVisible, setIsVisible] = useState(false);
    // Momento en que el placeholder se montó, o null si no está montado.
    // Va en ref y no en estado porque solo alimenta el cálculo del timer de
    // salida: escribirlo no debe re-renderizar.
    const shownAtRef = useRef<number | null>(null);

    useEffect(() => {
        if (isLoading) {
            // Ya visible: es una segunda carga encadenada (refetch tras
            // guardar, cambio de proyecto). No se reinicia el reloj, si no
            // el mínimo se extendería en cada eslabón.
            if (shownAtRef.current !== null) return;

            const timer = setTimeout(() => {
                shownAtRef.current = Date.now();
                setIsVisible(true);
            }, delay);
            return () => clearTimeout(timer);
        }

        // Terminó de cargar sin haber llegado a mostrarse: la ventana de
        // gracia hizo su trabajo.
        if (shownAtRef.current === null) return;

        const remaining = minDuration - (Date.now() - shownAtRef.current);
        if (remaining <= 0) {
            shownAtRef.current = null;
            setIsVisible(false);
            return;
        }

        const timer = setTimeout(() => {
            shownAtRef.current = null;
            setIsVisible(false);
        }, remaining);
        return () => clearTimeout(timer);
    }, [isLoading, delay, minDuration]);

    return isVisible;
}
