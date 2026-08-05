import { useCallback, useSyncExternalStore } from 'react';

// useSyncExternalStore y no useState + useEffect: el valor correcto sale ya en
// el primer render, sin el frame intermedio en que el componente cree estar en
// la rama equivocada. Eso importa acá porque el consumidor (AdminDashboard)
// monta o no monta un árbol entero según el resultado -- con un efecto se
// dispararía toda la carga de datos del panel para desmontarla un frame
// después.
export const useMediaQuery = (query: string): boolean => {
    const subscribe = useCallback(
        (onChange: () => void) => {
            const list = window.matchMedia(query);
            list.addEventListener('change', onChange);
            return () => list.removeEventListener('change', onChange);
        },
        [query]
    );

    const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

    // getServerSnapshot: no hay SSR en esta app, pero useSyncExternalStore lo
    // exige para no romper si algún test renderiza sin window.
    return useSyncExternalStore(subscribe, getSnapshot, () => false);
};
