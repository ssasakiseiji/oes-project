import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiFetch } from '../../api';
import { Modal } from './Modal';
import { LoadingSpinner } from './LoadingSpinner';

export const HistoricalChartModal = ({ isOpen, onClose, type, id, name }) => {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && id) {
            setIsLoading(true);
            const query = type === 'product' ? `?productId=${id}` : `?categoryId=${id}`;
            apiFetch(`/api/historical-data${query}`)
                .then(setData)
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, type, id]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Evolución de Precios: ${name}`}>
            {isLoading ? <LoadingSpinner /> : (
            <div style={{width: '100%', height: 300}}>
                <ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" /><XAxis dataKey="name" className="text-gray-600 dark:text-gray-400" /><YAxis tickFormatter={(val) => new Intl.NumberFormat('es-PY').format(val)} className="text-gray-600 dark:text-gray-400"/><RechartsTooltip formatter={(val) => new Intl.NumberFormat('es-PY').format(val)} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ddd', borderRadius: '8px' }}/><Legend /><Line type="monotone" dataKey="avgPrice" name="Precio Promedio" stroke="#2563eb" strokeWidth={2}/></LineChart></ResponsiveContainer>
            </div>
            )}
        </Modal>
    );
};
