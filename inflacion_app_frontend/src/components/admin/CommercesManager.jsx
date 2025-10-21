import React, { useState } from 'react';
import { Store, Users } from 'lucide-react';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { CommercesView } from './CommercesView';
import { StudentsAssignmentView } from './StudentsAssignmentView';

export const CommercesManager = () => {
    const [activeTab, setActiveTab] = useState('commerces');

    const tabs = [
        {
            id: 'commerces',
            label: 'Comercios',
            icon: Store,
            description: 'Gestionar comercios y ver estudiantes asignados'
        },
        {
            id: 'assignments',
            label: 'Asignaciones',
            icon: Users,
            description: 'Asignar comercios a estudiantes'
        }
    ];

    return (
        <div className="space-y-6">
            <Breadcrumbs items={[{ label: 'Panel Admin' }, { label: 'Gestión de Comercios' }]} />

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
                {activeTab === 'commerces' && <CommercesView />}
                {activeTab === 'assignments' && <StudentsAssignmentView />}
            </div>
        </div>
    );
};
