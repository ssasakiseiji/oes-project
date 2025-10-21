import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api';

// Query keys
export const monitorKeys = {
    all: ['monitor'],
    data: () => [...monitorKeys.all, 'data'],
};

// Fetch monitor data
export function useMonitorData() {
    return useQuery({
        queryKey: monitorKeys.data(),
        queryFn: async () => {
            const response = await apiFetch('/api/monitor-data');
            return response;
        },
        refetchInterval: 30000, // Refetch every 30 seconds
    });
}
