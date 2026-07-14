import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api';
import type {
    SaveDraftPayload,
    StudentDashboardPeriod,
    StudentTasksResponse,
    SubmitObservationsPayload,
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
        mutationFn: (payload: SaveDraftPayload) =>
            apiFetch('/api/draft-observations', {
                method: 'POST',
                body: JSON.stringify(payload),
            }),
        onSuccess: () => {
            // Invalidate and refetch student dashboard
            queryClient.invalidateQueries({ queryKey: studentKeys.dashboard() });
        },
    });
}

// Submit observations mutation
export function useSubmitObservations() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: SubmitObservationsPayload) =>
            apiFetch('/api/observations', {
                method: 'POST',
                body: JSON.stringify(payload),
            }),
        onSuccess: () => {
            // Invalidate and refetch student dashboard
            queryClient.invalidateQueries({ queryKey: studentKeys.dashboard() });
        },
    });
}
