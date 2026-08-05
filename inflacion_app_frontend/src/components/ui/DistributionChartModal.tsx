import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../api';
import { Modal } from './Modal';
import { ChartSkeleton } from './skeletons';
import { LoadingArea } from './LoadingArea';
import { SharesStackedChart, type ShareCategory, type ShareRow } from './charts/SharesStackedChart';
import { ORDINAL_RAMP_SIZE } from './charts/chartTheme';
import { formatQualitativeValue } from '../../utils/exportUtils';
import type { VariableDistributionEntry } from '../../types/api';

export interface DistributionChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    variableId: number | null;
    name: string;
    projectId: number;
    /** Para etiquetar: las booleanas llegan como 'true'/'false' desde la API. */
    dataType?: string;
}

// Complemento de HistoricalChartModal (promedio numérico) para variables
// categóricas/booleanas, donde un AVG no tiene sentido (Fase K).
//
// Fase AE: pasó de barras agrupadas de CONTEO a una barra al 100% por período.
// El conteo hacía que un período con más respuestas se viera como un cambio de
// opinión cuando solo era más gente respondiendo; la participación compara
// períodos de tamaño distinto sin mentir, y el conteo crudo sigue estando en el
// tooltip. También se fue la paleta de seis colores que se reciclaba a partir
// del séptimo: la rampa compartida corta en cinco y pliega la cola en "Otros".
export const DistributionChartModal = ({ isOpen, onClose, variableId, name, projectId, dataType }: DistributionChartModalProps) => {
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

    const { categories, rows } = useMemo(() => {
        const totals = new Map<string, number>();
        entries.forEach(entry =>
            Object.entries(entry.counts).forEach(([value, count]) => {
                totals.set(value, (totals.get(value) ?? 0) + count);
            }),
        );

        const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        const named = ranked.length > ORDINAL_RAMP_SIZE ? ranked.slice(0, ORDINAL_RAMP_SIZE - 1) : ranked;
        const folded = new Set(ranked.slice(named.length).map(([value]) => value));

        const categoryList: ShareCategory[] = named.map(([value]) => ({
            key: value,
            label: formatQualitativeValue(value, dataType ?? 'categorical'),
        }));
        if (folded.size > 0) {
            categoryList.push({ key: '__otros__', label: `Otros (${folded.size})` });
        }

        const rowList: ShareRow[] = entries.map(entry => {
            const counts: Record<string, number> = {};
            categoryList.forEach(category => {
                counts[category.key] = 0;
            });
            Object.entries(entry.counts).forEach(([value, count]) => {
                const key = folded.has(value) ? '__otros__' : value;
                counts[key] = (counts[key] ?? 0) + count;
            });
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            const shares: Record<string, number> = {};
            categoryList.forEach(category => {
                shares[category.key] = total > 0 ? counts[category.key] / total : 0;
            });
            return { period: entry.periodName, total, shares, counts };
        });

        return { categories: categoryList, rows: rowList };
    }, [entries, dataType]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Distribución de "${name}"`}>
            <LoadingArea isLoading={isLoading} skeleton={<ChartSkeleton />}>
                {rows.length === 0 ? (
                    <p className="text-sm text-muted py-6 text-center">
                        Esta variable no tiene respuestas cargadas en períodos cerrados.
                    </p>
                ) : (
                    <SharesStackedChart categories={categories} rows={rows} />
                )}
            </LoadingArea>
        </Modal>
    );
};
