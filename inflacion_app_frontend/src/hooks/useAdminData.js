import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api';

// Query keys
export const adminKeys = {
    all: ['admin'],
    periods: () => [...adminKeys.all, 'periods'],
    prices: (filters) => [...adminKeys.all, 'prices', filters],
    users: () => [...adminKeys.all, 'users'],
    analysis: (periodAId, periodBId) => [...adminKeys.all, 'analysis', periodAId, periodBId],
    historicalData: (productId, categoryId) => [...adminKeys.all, 'historical', { productId, categoryId }],
};

// Periods
export function usePeriods() {
    return useQuery({
        queryKey: adminKeys.periods(),
        queryFn: async () => {
            const response = await apiFetch('/api/periods');
            return response;
        },
    });
}

export function useCreatePeriod() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (periodData) => {
            const response = await apiFetch('/api/periods', {
                method: 'POST',
                body: JSON.stringify(periodData),
            });
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.periods() });
        },
    });
}

export function useUpdatePeriodStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }) => {
            const response = await apiFetch(`/api/periods/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status }),
            });
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.periods() });
        },
    });
}

// Analysis
export function useAnalysis(periodAId, periodBId, enabled = true) {
    return useQuery({
        queryKey: adminKeys.analysis(periodAId, periodBId),
        queryFn: async () => {
            const response = await apiFetch('/api/analysis', {
                method: 'POST',
                body: JSON.stringify({ periodAId, periodBId }),
            });
            return response;
        },
        enabled: enabled && !!periodAId && !!periodBId,
    });
}

export function useHistoricalData(productId, categoryId, enabled = true) {
    return useQuery({
        queryKey: adminKeys.historicalData(productId, categoryId),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (productId) params.append('productId', productId);
            if (categoryId) params.append('categoryId', categoryId);

            const response = await apiFetch(`/api/historical-data?${params.toString()}`);
            return response;
        },
        enabled: enabled && (!!productId || !!categoryId),
    });
}

// Prices
export function usePrices(filters = {}) {
    return useQuery({
        queryKey: adminKeys.prices(filters),
        queryFn: async () => {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    params.append(key, value);
                }
            });

            const response = await apiFetch(`/api/prices?${params.toString()}`);
            return response;
        },
    });
}

export function useUpdatePrice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, price }) => {
            const response = await apiFetch(`/api/prices/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ price }),
            });
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
        },
    });
}

export function useDeletePrice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            await apiFetch(`/api/prices/${id}`, {
                method: 'DELETE',
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
        },
    });
}

// Users
export function useUsers() {
    return useQuery({
        queryKey: adminKeys.users(),
        queryFn: async () => {
            const response = await apiFetch('/api/users');
            return response;
        },
    });
}

export function useUpdateUserRoles() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, roles }) => {
            const response = await apiFetch(`/api/users/${userId}/roles`, {
                method: 'POST',
                body: JSON.stringify({ roles }),
            });
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.users() });
        },
    });
}
