import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api';
import type {
    PriceEntryPayload,
    SaveDraftPayload,
    StudentDashboardPeriod,
    StudentTasksResponse,
} from '../types/api';

// Query keys
export const studentKeys = {
    all: ['student'] as const,
    tasks: () => [...studentKeys.all, 'tasks'] as const,
    dashboard: () => [...studentKeys.all, 'dashboard'] as const,
};

// Fetch student tasks
export function useStudentTasks() {
    return useQuery({
        queryKey: studentKeys.tasks(),
        queryFn: () => apiFetch<StudentTasksResponse>('/api/student-tasks'),
    });
}

// Fetch student dashboard
export function useStudentDashboard() {
    return useQuery({
        queryKey: studentKeys.dashboard(),
        queryFn: () => apiFetch<StudentDashboardPeriod[]>('/api/student/dashboard'),
    });
}

// Save draft mutation
export function useSaveDraft() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ commerceId, prices }: SaveDraftPayload) =>
            apiFetch('/api/save-draft', {
                method: 'POST',
                body: JSON.stringify({ commerceId, prices }),
            }),
        onSuccess: () => {
            // Invalidate and refetch student dashboard
            queryClient.invalidateQueries({ queryKey: studentKeys.dashboard() });
        },
    });
}

// Submit prices mutation
export function useSubmitPrices() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (pricesData: PriceEntryPayload[]) =>
            apiFetch('/api/submit-prices', {
                method: 'POST',
                body: JSON.stringify(pricesData),
            }),
        onSuccess: () => {
            // Invalidate and refetch student dashboard
            queryClient.invalidateQueries({ queryKey: studentKeys.dashboard() });
        },
    });
}
