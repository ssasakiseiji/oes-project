import { useEffect, useRef, useState } from 'react';

/*
 * ¿La página se movió lo suficiente como para que haya contenido pasando por
 * debajo del elemento fijo? Devuelve un ref para plantar un centinela y el
 * booleano correspondiente.
 *
 * IntersectionObserver y no un listener de scroll: el listener corre en el
 * hilo principal en cada frame de scroll para responder una pregunta binaria
 * que casi nunca cambia de valor. El observer avisa sólo en el cruce, que es
 * exactamente cuando hay algo que hacer.
 *
 * El centinela va ARRIBA del elemento fijo, no dentro: mientras se lo ve, la
 * página está en el tope y no hay nada que separar; en cuanto sale del
 * viewport, el contenido empezó a deslizarse por abajo.
 */
export const useScrolledPast = <T extends HTMLElement>() => {
    const sentinelRef = useRef<T>(null);
    const [hasScrolledPast, setHasScrolledPast] = useState(false);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        // jsdom no implementa IntersectionObserver: sin esta guarda, cualquier
        // test que monte el componente explota al construirlo. Quedarse en
        // false es el estado correcto para un entorno que no scrollea.
        if (!sentinel || typeof IntersectionObserver === 'undefined') return;

        const observer = new IntersectionObserver(
            ([entry]) => setHasScrolledPast(!entry.isIntersecting),
            { threshold: 0 },
        );
        observer.observe(sentinel);

        return () => observer.disconnect();
    }, []);

    return { sentinelRef, hasScrolledPast };
};
