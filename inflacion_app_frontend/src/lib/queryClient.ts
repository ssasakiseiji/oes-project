import { QueryCache, QueryClient, MutationCache } from '@tanstack/react-query';

// `cacheTime`/per-query `onError` son API de react-query v4; en v5 son
// `gcTime` y QueryCache/MutationCache-level `onError` respectivamente.
// El objeto original (JS, sin chequeo de tipos) seteaba las claves viejas,
// que v5 ignora en silencio: el cache-time real quedaba en el default de
// 5 min en vez de los 10 buscados, y no había logging global de errores.
export const queryClient = new QueryClient({
    queryCache: new QueryCache({
        onError: (error) => {
            console.error('Query error:', error);
        },
    }),
    mutationCache: new MutationCache({
        onError: (error) => {
            console.error('Mutation error:', error);
        },
    }),
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 10, // 10 minutes
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});
