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
}

// Complemento de HistoricalChartModal (promedio numérico) para variables
// categóricas/booleanas, donde un AVG no tiene sentido -- muestra un
// conteo de frecuencias por opción, agrupado por período (Fase K).
const BAR_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2'];

export const DistributionChartModal = ({ isOpen, onClose, variableId, name }: DistributionChartModalProps) => {
    const [entries, setEntries] = useState<VariableDistributionEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && variableId) {
            setIsLoading(true);
            apiFetch<VariableDistributionEntry[]>(`/api/variable-distribution?variableId=${variableId}`)
                .then(setEntries)
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, variableId]);

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
                            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
                            <XAxis dataKey="name" className="text-gray-600 dark:text-gray-400" />
                            <YAxis allowDecimals={false} className="text-gray-600 dark:text-gray-400" />
                            <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ddd', borderRadius: '8px' }} />
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
