import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiFetch } from '../../api';
import { Modal } from './Modal';
import { LoadingSpinner } from './LoadingSpinner';
import type { VariableDistributionEntry } from '../../types/api';

export interface DistributionChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    variableId: number | null;
    name: string;
    projectId: number;
}

// Complemento de HistoricalChartModal (promedio numérico) para variables
// categóricas/booleanas, donde un AVG no tiene sentido -- muestra un
// conteo de frecuencias por opción, agrupado por período (Fase K).
const BAR_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2'];

export const DistributionChartModal = ({ isOpen, onClose, variableId, name, projectId }: DistributionChartModalProps) => {
    const [entries, setEntries] = useState<VariableDistributionEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && variableId) {
            setIsLoading(true);
            apiFetch<VariableDistributionEntry[]>(`/api/variable-distribution?projectId=${projectId}&variableId=${variableId}`)
                .then(setEntries)
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, variableId, projectId]);

    const { data, seriesKeys } = useMemo(() => {
        const keys = Array.from(new Set(entries.flatMap(e => Object.keys(e.counts)))).sort();
        const rows = entries.map(e => ({ name: e.periodName, ...e.counts }));
        return { data: rows, seriesKeys: keys };
    }, [entries]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Distribución de "${name}"`}>
            {isLoading ? <LoadingSpinner /> : (
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" />
                            <XAxis dataKey="name" tick={{ fill: 'var(--color-ink)' }} />
                            <YAxis allowDecimals={false} tick={{ fill: 'var(--color-ink)' }} />
                            <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--nc-radius-md)', color: 'var(--color-ink)' }} />
                            <Legend />
                            {seriesKeys.map((key, i) => (
                                <Bar key={key} dataKey={key} name={key} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Modal>
    );
};
