import { useState } from 'react';
import { Store, Users, type LucideIcon } from 'lucide-react';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { ObservationUnitsView } from './ObservationUnitsView';
import { StudentsAssignmentView } from './StudentsAssignmentView';

type TabId = 'observation-units' | 'assignments';

interface ObservationUnitsManagerProps {
    projectId: number;
}

export const ObservationUnitsManager = ({ projectId }: ObservationUnitsManagerProps) => {
    const [activeTab, setActiveTab] = useState<TabId>('observation-units');

    const tabs: { id: TabId; label: string; icon: LucideIcon; description: string }[] = [
        {
            id: 'observation-units',
            label: 'Unidades de Observación',
            icon: Store,
            description: 'Gestionar unidades de observación y ver estudiantes asignados'
        },
        {
            id: 'assignments',
            label: 'Asignaciones',
            icon: Users,
            description: 'Asignar unidades de observación a estudiantes'
        }
    ];

    return (
        <div className="space-y-6">
            <Breadcrumbs items={[{ label: 'Panel Admin' }, { label: 'Gestión de Unidades de Observación' }]} />

            {/* Tabs Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-1">
                <div className="flex gap-1">
                    {tabs.map((tab) => {
                        const TabIcon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                                    font-semibold text-sm transition-all duration-200
                                    ${isActive
                                        ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                    }
                                `}
                            >
                                <TabIcon size={18} />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
            {/* Tab Content */}
            <div className="animate-fade-in">
                {activeTab === 'observation-units' && <ObservationUnitsView projectId={projectId} />}
                {activeTab === 'assignments' && <StudentsAssignmentView projectId={projectId} />}
            </div>
        </div>
    );
};
