import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api';
import type {
    AnalysisResult,
    CreatePeriodPayload,
    ObservationFilters,
    ObservationRow,
    Period,
    User,
    VariableDistributionEntry,
    VariableHistoryRow,
} from '../types/api';

// Query keys
export const adminKeys = {
    all: ['admin'] as const,
    periods: () => [...adminKeys.all, 'periods'] as const,
    observations: (filters: ObservationFilters) => [...adminKeys.all, 'observations', filters] as const,
    users: () => [...adminKeys.all, 'users'] as const,
    analysis: (periodAId?: number | string, periodBId?: number | string) =>
        [...adminKeys.all, 'analysis', periodAId, periodBId] as const,
    variableHistory: (variableId?: number | string, studyFieldId?: number | string) =>
        [...adminKeys.all, 'variable-history', { variableId, studyFieldId }] as const,
    variableDistribution: (variableId?: number | string) =>
        [...adminKeys.all, 'variable-distribution', variableId] as const,
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

export function useVariableHistory(variableId?: number | string, studyFieldId?: number | string, enabled = true) {
    return useQuery({
        queryKey: adminKeys.variableHistory(variableId, studyFieldId),
        queryFn: () => {
            const params = new URLSearchParams();
            if (variableId) params.append('variableId', String(variableId));
            if (studyFieldId) params.append('studyFieldId', String(studyFieldId));

            return apiFetch<VariableHistoryRow[]>(`/api/variable-history?${params.toString()}`);
        },
        enabled: enabled && (!!variableId || !!studyFieldId),
    });
}

export function useVariableDistribution(variableId?: number | string, enabled = true) {
    return useQuery({
        queryKey: adminKeys.variableDistribution(variableId),
        queryFn: () =>
            apiFetch<VariableDistributionEntry[]>(`/api/variable-distribution?variableId=${variableId}`),
        enabled: enabled && !!variableId,
    });
}

// Observations
export function useObservations(filters: ObservationFilters = {}) {
    return useQuery({
        queryKey: adminKeys.observations(filters),
        queryFn: () => {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    params.append(key, String(value));
                }
            });

            return apiFetch<ObservationRow[]>(`/api/observations?${params.toString()}`);
        },
    });
}

export function useUpdateObservation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, value }: { id: number; value: number | string | boolean }) =>
            apiFetch(`/api/observations/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ value }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
        },
    });
}

export function useDeleteObservation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) =>
            apiFetch(`/api/observations/${id}`, {
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
