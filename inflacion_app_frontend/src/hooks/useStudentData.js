import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api';

// Query keys
export const studentKeys = {
    all: ['student'],
    tasks: () => [...studentKeys.all, 'tasks'],
    dashboard: () => [...studentKeys.all, 'dashboard'],
};

// Fetch student tasks
export function useStudentTasks() {
    return useQuery({
        queryKey: studentKeys.tasks(),
        queryFn: async () => {
            const response = await apiFetch('/api/student-tasks');
            return response;
        },
    });
}

// Fetch student dashboard
export function useStudentDashboard() {
    return useQuery({
        queryKey: studentKeys.dashboard(),
        queryFn: async () => {
            const response = await apiFetch('/api/student/dashboard');
            return response;
        },
    });
}

// Save draft mutation
export function useSaveDraft() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ commerceId, prices }) => {
            const response = await apiFetch('/api/save-draft', {
                method: 'POST',
                body: JSON.stringify({ commerceId, prices }),
            });
            return response;
        },
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
        mutationFn: async (pricesData) => {
            const response = await apiFetch('/api/submit-prices', {
                method: 'POST',
                body: JSON.stringify(pricesData),
            });
            return response;
        },
        onSuccess: () => {
            // Invalidate and refetch student dashboard
            queryClient.invalidateQueries({ queryKey: studentKeys.dashboard() });
        },
    });
}
