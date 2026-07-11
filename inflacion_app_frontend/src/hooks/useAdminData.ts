import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api';
import type {
    AnalysisResult,
    CreatePeriodPayload,
    HistoricalRow,
    Period,
    PriceFilters,
    PriceRow,
    User,
} from '../types/api';

// Query keys
export const adminKeys = {
    all: ['admin'] as const,
    periods: () => [...adminKeys.all, 'periods'] as const,
    prices: (filters: PriceFilters) => [...adminKeys.all, 'prices', filters] as const,
    users: () => [...adminKeys.all, 'users'] as const,
    analysis: (periodAId?: number | string, periodBId?: number | string) =>
        [...adminKeys.all, 'analysis', periodAId, periodBId] as const,
    historicalData: (productId?: number | string, categoryId?: number | string) =>
        [...adminKeys.all, 'historical', { productId, categoryId }] as const,
};

// Periods
export function usePeriods() {
    return useQuery({
        queryKey: adminKeys.periods(),
        queryFn: () => apiFetch<Period[]>('/api/periods'),
    });
}

export function useCreatePeriod() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (periodData: CreatePeriodPayload) =>
            apiFetch<Period>('/api/periods', {
                method: 'POST',
                body: JSON.stringify(periodData),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.periods() });
        },
    });
}

export function useUpdatePeriodStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            apiFetch<Period>(`/api/periods/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.periods() });
        },
    });
}

// Analysis
export function useAnalysis(periodAId?: number | string, periodBId?: number | string, enabled = true) {
    return useQuery({
        queryKey: adminKeys.analysis(periodAId, periodBId),
        queryFn: () =>
            apiFetch<AnalysisResult>('/api/analysis', {
                method: 'POST',
                body: JSON.stringify({ periodAId, periodBId }),
            }),
        enabled: enabled && !!periodAId && !!periodBId,
    });
}

export function useHistoricalData(productId?: number | string, categoryId?: number | string, enabled = true) {
    return useQuery({
        queryKey: adminKeys.historicalData(productId, categoryId),
        queryFn: () => {
            const params = new URLSearchParams();
            if (productId) params.append('productId', String(productId));
            if (categoryId) params.append('categoryId', String(categoryId));

            return apiFetch<HistoricalRow[]>(`/api/historical-data?${params.toString()}`);
        },
        enabled: enabled && (!!productId || !!categoryId),
    });
}

// Prices
export function usePrices(filters: PriceFilters = {}) {
    return useQuery({
        queryKey: adminKeys.prices(filters),
        queryFn: () => {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    params.append(key, String(value));
                }
            });

            return apiFetch<PriceRow[]>(`/api/prices?${params.toString()}`);
        },
    });
}

export function useUpdatePrice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, price }: { id: number; price: number }) =>
            apiFetch(`/api/prices/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ price }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
        },
    });
}

export function useDeletePrice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) =>
            apiFetch(`/api/prices/${id}`, {
                method: 'DELETE',
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
        },
    });
}

// Users
export function useUsers() {
    return useQuery({
        queryKey: adminKeys.users(),
        queryFn: () => apiFetch<User[]>('/api/users'),
    });
}

export function useUpdateUserRoles() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, roles }: { userId: number; roles: string[] }) =>
            apiFetch<User>(`/api/users/${userId}/roles`, {
                method: 'POST',
                body: JSON.stringify({ roles }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.users() });
        },
    });
}
