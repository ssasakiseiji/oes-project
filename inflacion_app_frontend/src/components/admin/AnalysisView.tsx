import { useState, useEffect } from 'react';
import Select from 'react-select';
import { BarChart2, PieChart, AreaChart, AlertTriangle, Hash, ListFilter } from 'lucide-react';
import { apiFetch } from '../../api';
import { getReactSelectStyles } from '../../utils/reactSelectStyles';
import { formatMetric, formatQualitativeValue } from '../../utils/exportUtils';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Tooltip } from '../ui/Tooltip';
import { StatCard } from '../ui/StatCard';
import { HistoricalChartModal } from '../ui/HistoricalChartModal';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion';
import { Button } from '../ui/button';
import type {
    AnalysisResult,
    Period,
    QualitativeVariableAnalysis,
    QuantitativeVariableAnalysis,
    StudyFieldAnalysis,
    UnitTotal,
} from '../../types/api';

// Fase AA/AB: esta vista dejó de ser "la canasta" y pasó a ser el análisis
// completo del proyecto. Tres cambios de fondo respecto de la versión anterior:
//
//  1. Los totales se agrupan POR UNIDAD (StudyField.unitOfMeasure, Fase Z). El
//     total único de antes sumaba toda variable monetaria del proyecto sin
//     mirar la unidad; ahora ₲ y °C nunca caen en el mismo número.
//  2. Cada campo de estudio se parte en bloque CUANTITATIVO (numeric) y
//     CUALITATIVO (categorical/boolean/text). Antes los no-numéricos
//     directamente no aparecían acá.
//  3. `null` significa indefinido y se muestra "—". La versión anterior
//     mostraba 0 para una variable sin datos, que se leía como un precio real
//     de cero.

interface PeriodOption {
    value: number;
    label: string;
}

interface ChartModalState {
    isOpen: boolean;
    type: 'variable' | 'studyField' | null;
    id: number | null;
    name: string;
}

interface AnalysisViewProps {
    projectId: number;
}

const CLOSED_CHART_MODAL: ChartModalState = { isOpen: false, type: null, id: null, name: '' };

const formatVariation = (variation: number | null) =>
    variation === null ? '—' : `${variation.toFixed(2)}%`;

const variationClass = (variation: number | null) => {
    if (variation === null) return 'text-muted';
    return variation >= 0 ? 'text-danger' : 'text-success';
};

const UnitTotalCard = ({ total, periodALabel, periodBLabel }: {
    total: UnitTotal;
    periodALabel: string;
    periodBLabel: string;
}) => (
    <StatCard
        title={`${total.method === 'sum' ? 'Canasta' : 'Promedio'} (${total.unitOfMeasure})`}
        value={formatMetric(total.valueA, total.unitOfMeasure, total.isCurrency)}
        change={total.variation ?? undefined}
        icon={total.method === 'sum' ? <BarChart2 size={24} /> : <Hash size={24} />}
        color={total.variation === null ? 'blue' : total.variation >= 0 ? 'red' : 'green'}
        subtitle={`${periodALabel} vs ${periodBLabel}: ${formatMetric(total.valueB, total.unitOfMeasure, total.isCurrency)}`}
    />
);

const QuantitativeBlock = ({ field, onOpenChart }: {
    field: StudyFieldAnalysis;
    onOpenChart: (variable: QuantitativeVariableAnalysis) => void;
}) => {
    if (field.quantitative.length === 0) return null;

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Hash size={14} className="text-muted" />
                <h4 className="text-sm font-medium text-ink">Cuantitativa</h4>
                {field.unitOfMeasure ? (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent-800/30 text-accent-300">
                        {field.unitOfMeasure}
                    </span>
                ) : (
                    <span className="text-xs text-warning">sin unidad declarada</span>
                )}
            </div>

            {field.aggregate === null ? (
                <p className="text-xs text-muted">
                    Las variables se listan individualmente pero no se agregan en una sola
                    métrica: sin una unidad de medida declarada en el campo de estudio, sumarlas
                    o promediarlas produciría un número sin significado.
                </p>
            ) : field.aggregate.excludedVariables > 0 && (
                <p className="text-xs text-muted">
                    {field.aggregate.excludedVariables} de {field.quantitative.length} variable(s)
                    quedaron fuera del agregado por no tener datos en ambos períodos.
                </p>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b" style={{ borderColor: 'var(--color-divider)' }}>
                            <th className="text-left p-2 font-medium text-muted">Variable</th>
                            <th className="text-left p-2 font-medium text-muted">Presentación</th>
                            <th className="text-right p-2 font-medium text-muted">Valor Anterior</th>
                            <th className="text-right p-2 font-medium text-muted">Valor Actual</th>
                            <th className="text-right p-2 font-medium text-muted">Variación</th>
                            <th className="text-center p-2 font-medium text-muted">Historial</th>
                        </tr>
                    </thead>
                    <tbody>
                        {field.quantitative.map(v => (
                            <tr key={v.id} className="border-b last:border-none" style={{ borderColor: 'var(--color-divider)' }}>
                                <td className="p-2 text-ink">{v.name}</td>
                                <td className="p-2 text-muted text-xs">{v.unit ?? '—'}</td>
                                <td className="text-right p-2 font-mono text-ink">
                                    {formatMetric(v.valueB, field.unitOfMeasure, v.isCurrency)}
                                </td>
                                <td className="text-right p-2 font-mono text-ink">
                                    {formatMetric(v.valueA, field.unitOfMeasure, v.isCurrency)}
                                </td>
                                <td className={`text-right p-2 font-semibold ${variationClass(v.variation)}`}>
                                    {formatVariation(v.variation)}
                                </td>
                                <td className="text-center p-2">
                                    <Tooltip content="Ver evolución histórica">
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => onOpenChart(v)}
                                            className="text-muted hover:text-ink"
                                        >
                                            <AreaChart size={16} />
                                        </Button>
                                    </Tooltip>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    {field.aggregate !== null && (
                        <tfoot>
                            <tr className="border-t-2" style={{ borderColor: 'var(--color-divider)' }}>
                                <td className="p-2 font-medium text-ink" colSpan={2}>
                                    {field.aggregate.method === 'sum' ? 'Canasta del campo' : 'Promedio del campo'}
                                </td>
                                <td className="text-right p-2 font-mono font-semibold text-ink">
                                    {formatMetric(field.aggregate.valueB, field.unitOfMeasure, field.aggregate.isCurrency)}
                                </td>
                                <td className="text-right p-2 font-mono font-semibold text-ink">
                                    {formatMetric(field.aggregate.valueA, field.unitOfMeasure, field.aggregate.isCurrency)}
                                </td>
                                <td className={`text-right p-2 font-semibold ${variationClass(field.aggregate.variation)}`}>
                                    {formatVariation(field.aggregate.variation)}
                                </td>
                                <td />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};

const FrequencyList = ({ variable, distribution, responses, label }: {
    variable: QualitativeVariableAnalysis;
    distribution: QualitativeVariableAnalysis['distributionA'];
    responses: number;
    label: string;
}) => (
    <div className="flex-1 min-w-0">
        <p className="text-xs text-muted mb-1">{label} · {responses} respuesta(s)</p>
        {distribution.length === 0 ? (
            <p className="text-xs text-muted italic">Sin datos</p>
        ) : (
            <ul className="space-y-1">
                {distribution.map(entry => (
                    <li key={entry.value} className="text-sm">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-ink truncate">
                                {formatQualitativeValue(entry.value, variable.dataType)}
                            </span>
                            <span className="text-muted font-mono text-xs shrink-0">
                                {entry.count} · {(entry.share * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="h-1 rounded bg-accent-800/30 mt-0.5">
                            <div
                                className="h-1 rounded bg-accent"
                                style={{ width: `${entry.share * 100}%` }}
                            />
                        </div>
                    </li>
                ))}
            </ul>
        )}
    </div>
);

const QualitativeBlock = ({ field, periodALabel, periodBLabel }: {
    field: StudyFieldAnalysis;
    periodALabel: string;
    periodBLabel: string;
}) => {
    if (field.qualitative.length === 0) return null;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <ListFilter size={14} className="text-muted" />
                <h4 className="text-sm font-medium text-ink">Cualitativa</h4>
                <span className="text-xs text-muted">frecuencias</span>
            </div>

            <div className="space-y-4">
                {field.qualitative.map(v => (
                    <div key={v.id} className="rounded-[var(--nc-radius-md)] p-3" style={{ border: '1px solid var(--color-divider)' }}>
                        <p className="text-sm font-medium text-ink mb-2">{v.name}</p>
                        {v.dataType === 'text' ? (
                            // El texto libre no tiene distribución: N respuestas abiertas
                            // distintas no son una frecuencia. Se reporta la cobertura, que
                            // es lo único agregable con sentido.
                            <p className="text-xs text-muted">
                                Texto libre · {v.responsesB} respuesta(s) en {periodBLabel},{' '}
                                {v.responsesA} en {periodALabel}. Sin distribución agregada;
                                consultá las respuestas en Registros.
                            </p>
                        ) : (
                            <div className="flex flex-col sm:flex-row gap-4">
                                <FrequencyList variable={v} distribution={v.distributionB} responses={v.responsesB} label={periodBLabel} />
                                <FrequencyList variable={v} distribution={v.distributionA} responses={v.responsesA} label={periodALabel} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const AnalysisView = ({ projectId }: AnalysisViewProps) => {
    const [periods, setPeriods] = useState<PeriodOption[]>([]);
    const [periodA, setPeriodA] = useState<PeriodOption | null>(null);
    const [periodB, setPeriodB] = useState<PeriodOption | null>(null);
    const [reportData, setReportData] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeAccordion, setActiveAccordion] = useState<number | null>(null);
    const [chartModal, setChartModal] = useState<ChartModalState>(CLOSED_CHART_MODAL);

    useEffect(() => {
        // Limpiar selección/reporte del proyecto anterior -- si no, un
        // proyecto con <2 períodos cerrados dejaría periodA/periodB (y el
        // reporte ya renderizado) apuntando a períodos de OTRO proyecto.
        setPeriodA(null);
        setPeriodB(null);
        setReportData(null);

        const fetchData = async () => {
            const periodsData = await apiFetch<Period[]>(`/api/periods?projectId=${projectId}`);
            const closedPeriods = periodsData.filter(p => p.status === 'Closed').map(p => ({ value: p.id, label: p.name }));
            setPeriods(closedPeriods);
            if (closedPeriods.length >= 2) {
                setPeriodA(closedPeriods[0]);
                setPeriodB(closedPeriods[1]);
            }
        };
        fetchData();
    }, [projectId]);

    const generateReport = async () => {
        if (!periodA || !periodB) return;
        setIsLoading(true);
        setReportData(null);
        try {
            const data = await apiFetch<AnalysisResult>('/api/analysis', {
                method: 'POST',
                body: JSON.stringify({ periodAId: periodA.value, periodBId: periodB.value, projectId }),
            });
            setReportData(data);
        } finally { setIsLoading(false); }
    };

    useEffect(() => {
        if (periodA && periodB) {
            generateReport();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodA, periodB]);

    const periodALabel = periodA?.label ?? 'Actual';
    const periodBLabel = periodB?.label ?? 'Anterior';

    return (
        <div className="space-y-6">
            <Breadcrumbs items={[{ label: 'Panel Admin' }, { label: 'Análisis' }]} />
            <div className="card elev-sm p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <Select<PeriodOption> placeholder="Comparar Período..." options={periods} value={periodA} onChange={(option) => setPeriodA(option)} styles={getReactSelectStyles<PeriodOption>()} />
                <Select<PeriodOption> placeholder="con Período..." options={periods} value={periodB} onChange={(option) => setPeriodB(option)} styles={getReactSelectStyles<PeriodOption>()} />
                <Button onClick={generateReport} disabled={isLoading || !periodA || !periodB} className="w-full">Analizar</Button>
            </div>

            {isLoading && <LoadingSpinner />}
            {!isLoading && !reportData && (
                <EmptyState
                    icon={BarChart2}
                    title="Sin análisis generado"
                    description="Selecciona dos períodos cerrados para comenzar el análisis comparativo."
                />
            )}

            {reportData && (
                <div className="space-y-6">
                    {reportData.unitlessNumericStudyFields.length > 0 && (
                        <div className="card elev-sm p-4 flex items-start gap-3" style={{ borderLeft: '3px solid var(--color-warning)' }}>
                            <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="text-ink font-medium">Campos sin unidad de medida</p>
                                <p className="text-muted text-xs mt-1">
                                    {reportData.unitlessNumericStudyFields.map(f => f.name).join(', ')} —
                                    tienen variables numéricas pero no declaran una unidad, así que sus
                                    valores se listan pero no se agregan ni entran en los totales.
                                    Cargá la unidad en Variables y Campos de Estudio.
                                </p>
                            </div>
                        </div>
                    )}

                    {reportData.unitTotals.length > 0 && (
                        <div>
                            <h3 className="text-lg font-medium text-ink mb-3">Totales por Unidad</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {reportData.unitTotals.map(total => (
                                    <UnitTotalCard
                                        key={total.unitOfMeasure}
                                        total={total}
                                        periodALabel={periodALabel}
                                        periodBLabel={periodBLabel}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="card elev-sm p-6">
                        <h3 className="text-lg font-medium text-ink mb-4">Análisis por Campo de Estudio</h3>
                        {reportData.studyFieldAnalysis.length === 0 ? (
                            <p className="text-sm text-muted">Este proyecto no tiene campos de estudio.</p>
                        ) : (
                            <Accordion
                                type="single"
                                collapsible
                                className="gap-3"
                                // '' (y no undefined) para el estado "ninguno abierto": pasar
                                // undefined hace que Radix trate al Accordion como no
                                // controlado y luego warnee al recibir un value real.
                                value={activeAccordion !== null ? String(activeAccordion) : ''}
                                onValueChange={(v) => setActiveAccordion(v ? Number(v) : null)}
                            >
                                {reportData.studyFieldAnalysis.map((field, index) => (
                                    <AccordionItem key={field.id} value={String(index)} className="card elev-sm p-3">
                                        <div className="flex items-center gap-2">
                                            <AccordionTrigger className="flex-1">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="font-medium text-ink">{field.name}</span>
                                                    {field.unitOfMeasure && (
                                                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent-800/30 text-accent-300">
                                                            {field.unitOfMeasure}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-muted">
                                                        {field.quantitative.length} cuant. · {field.qualitative.length} cual.
                                                    </span>
                                                    {field.aggregate && (
                                                        <span className={`font-semibold ${variationClass(field.aggregate.variation)}`}>
                                                            {formatVariation(field.aggregate.variation)}
                                                        </span>
                                                    )}
                                                </div>
                                            </AccordionTrigger>
                                            {/* El historial agregado del campo requiere unidad declarada
                                                (el backend lo rechaza si no) -- ver getStudyFieldHistory. */}
                                            {field.unitOfMeasure && field.quantitative.length > 0 && (
                                                <Tooltip content="Ver evolución histórica">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        onClick={() => setChartModal({ isOpen: true, type: 'studyField', id: field.id, name: field.name })}
                                                        className="text-muted hover:text-ink"
                                                    >
                                                        <AreaChart size={16} />
                                                    </Button>
                                                </Tooltip>
                                            )}
                                        </div>
                                        <AccordionContent>
                                            <div className="pt-3 mt-1 space-y-5" style={{ borderTop: '1px solid var(--color-divider)' }}>
                                                {field.quantitative.length === 0 && field.qualitative.length === 0 && (
                                                    <p className="text-sm text-muted">Este campo de estudio no tiene variables.</p>
                                                )}
                                                <QuantitativeBlock
                                                    field={field}
                                                    onOpenChart={(v) => setChartModal({ isOpen: true, type: 'variable', id: v.id, name: v.name })}
                                                />
                                                <QualitativeBlock
                                                    field={field}
                                                    periodALabel={periodALabel}
                                                    periodBLabel={periodBLabel}
                                                />
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        )}
                    </div>
                </div>
            )}

            <HistoricalChartModal {...chartModal} projectId={projectId} onClose={() => setChartModal(CLOSED_CHART_MODAL)} />
        </div>
    );
};
