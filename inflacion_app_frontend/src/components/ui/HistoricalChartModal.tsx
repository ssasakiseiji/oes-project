import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiFetch } from '../../api';
import { Modal } from './Modal';
import { LoadingSpinner } from './LoadingSpinner';
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
            {isLoading ? <LoadingSpinner /> : (
            <div style={{width: '100%', height: 300}}>
                <ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" /><XAxis dataKey="name" tick={{ fill: 'var(--color-ink)' }} /><YAxis tickFormatter={(val) => new Intl.NumberFormat('es-PY').format(val)} tick={{ fill: 'var(--color-ink)' }}/><RechartsTooltip formatter={(val) => new Intl.NumberFormat('es-PY').format(Number(val))} contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--nc-radius-md)', color: 'var(--color-ink)' }}/><Legend /><Line type="monotone" dataKey="avgValue" name="Valor Promedio" stroke="var(--color-accent)" strokeWidth={2}/></LineChart></ResponsiveContainer>
            </div>
            )}
        </Modal>
    );
};
