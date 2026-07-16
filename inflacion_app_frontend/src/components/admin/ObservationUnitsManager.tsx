import { useState } from 'react';
import { Store, Users, type LucideIcon } from 'lucide-react';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { ObservationUnitsView } from './ObservationUnitsView';
import { StudentsAssignmentView } from './StudentsAssignmentView';

type TabId = 'observation-units' | 'assignments';

interface ObservationUnitsManagerProps {
    projectId: number;
}

export const ObservationUnitsManager = ({ projectId }: ObservationUnitsManagerProps) => {
    const [activeTab, setActiveTab] = useState<TabId>('observation-units');

    const tabs: { id: TabId; label: string; icon: LucideIcon }[] = [
        {
            id: 'observation-units',
            label: 'Unidades de Observación',
            icon: Store,
        },
        {
            id: 'assignments',
            label: 'Asignaciones',
            icon: Users,
        }
    ];

    return (
        <div className="space-y-6">
            <Breadcrumbs items={[{ label: 'Panel Admin' }, { label: 'Gestión de Unidades de Observación' }]} />

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
                <TabsList>
                    {tabs.map((tab) => (
                        <TabsTrigger key={tab.id} value={tab.id}>
                            <tab.icon size={16} />
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                <TabsContent value="observation-units">
                    <ObservationUnitsView projectId={projectId} />
                </TabsContent>
                <TabsContent value="assignments">
                    <StudentsAssignmentView projectId={projectId} />
                </TabsContent>
            </Tabs>
        </div>
    );
};
