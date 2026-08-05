import { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import { Modal } from './Modal';
import { ChartSkeleton } from './skeletons';
import { LoadingArea } from './LoadingArea';
import { EvolutionLineChart } from './charts/EvolutionLineChart';
import { formatNumber } from './charts/chartTheme';
import type { VariableHistoryRow } from '../../types/api';

export interface HistoricalChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'variable' | 'studyField' | null;
    id: number | null;
    name: string;
    projectId: number;
}

export const HistoricalChartModal = ({ isOpen, onClose, type, id, name, projectId }: HistoricalChartModalProps) => {
    const [data, setData] = useState<VariableHistoryRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && id) {
            setIsLoading(true);
            const idParam = type === 'variable' ? `variableId=${id}` : `studyFieldId=${id}`;
            apiFetch<VariableHistoryRow[]>(`/api/variable-history?projectId=${projectId}&${idParam}`)
                .then(setData)
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, type, id, projectId]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Evolución de "${name}"`}>
            <LoadingArea isLoading={isLoading} skeleton={<ChartSkeleton />}>
                {/* Comparte el gráfico con la pestaña de Gráficos (Fase AE): el
                    mismo dato dibujado dos veces con dos estilos distintos se
                    lee como dos datos distintos. */}
                <EvolutionLineChart
                    height={300}
                    data={data.map(row => ({
                        period: row.name,
                        value: row.avgValue === null ? null : Number(row.avgValue),
                    }))}
                    formatValue={formatNumber}
                    seriesLabel="Valor promedio"
                />
                <p className="text-xs text-muted mt-2">Solo períodos cerrados.</p>
            </LoadingArea>
        </Modal>
    );
};
