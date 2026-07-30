import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiFetch } from '../api';
import type { ProjectMembershipSummary } from '../types/api';

interface ProjectContextValue {
    activeProjectId: number | null;
    switchProject: (projectId: number) => void;
    hasMultipleProjects: boolean;
    availableProjects: ProjectMembershipSummary[];
    isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
};

interface ProjectProviderProps {
    children: ReactNode;
}

// Mismo patrón que RoleContext, pero la lista de "roles disponibles" acá es
// una lista de proyectos, poblada desde GET /api/projects/mine (no desde un
// prop, porque a diferencia de los roles esta info no viaja en el JWT).
export const ProjectProvider = ({ children }: ProjectProviderProps) => {
    const [availableProjects, setAvailableProjects] = useState<ProjectMembershipSummary[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        apiFetch<ProjectMembershipSummary[]>('/api/projects/mine')
            .then((projects) => {
                if (cancelled) return;
                setAvailableProjects(projects);

                if (projects.length > 0) {
                    const savedProjectIdRaw = localStorage.getItem('activeProjectId');
                    const savedProjectId = savedProjectIdRaw ? Number(savedProjectIdRaw) : null;

                    // Chequea que el proyecto guardado siga siendo válido para este usuario
                    const savedProject = savedProjectId !== null
                        ? projects.find(p => p.projectId === savedProjectId)
                        : undefined;
                    const defaultProject = savedProject ?? projects[0];

                    setActiveProjectId(defaultProject.projectId);
                    localStorage.setItem('activeProjectId', String(defaultProject.projectId));
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const switchProject = (projectId: number) => {
        if (availableProjects.some(p => p.projectId === projectId)) {
            setActiveProjectId(projectId);
            localStorage.setItem('activeProjectId', String(projectId));
        }
    };

    const hasMultipleProjects = availableProjects.length > 1;

    const value: ProjectContextValue = {
        activeProjectId,
        switchProject,
        hasMultipleProjects,
        availableProjects,
        isLoading,
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
};
