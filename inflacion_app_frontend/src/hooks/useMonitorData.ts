import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api';
import type { MonitorPeriod } from '../types/api';

// Query keys
export const monitorKeys = {
    all: ['monitor'] as const,
    data: () => [...monitorKeys.all, 'data'] as const,
};

// Fetch monitor data
export function useMonitorData() {
    return useQuery({
        queryKey: monitorKeys.data(),
        queryFn: () => apiFetch<MonitorPeriod[]>('/api/monitor-data'),
        refetchInterval: 30000, // Refetch every 30 seconds
    });
}
