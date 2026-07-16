import { useState, useEffect } from 'react';
import Select from 'react-select';
import { BarChart2, PieChart, AreaChart } from 'lucide-react';
import { apiFetch } from '../../api';
import { getReactSelectStyles } from '../../utils/reactSelectStyles';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Tooltip } from '../ui/Tooltip';
import { StatCard } from '../ui/StatCard';
import { HistoricalChartModal } from '../ui/HistoricalChartModal';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion';
import { Button } from '../ui/button';
import type { AnalysisResult, Period, StudyField, Variable } from '../../types/api';

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

export const AnalysisView = ({ projectId }: AnalysisViewProps) => {
    const [periods, setPeriods] = useState<PeriodOption[]>([]);
    const [periodA, setPeriodA] = useState<PeriodOption | null>(null);
    const [periodB, setPeriodB] = useState<PeriodOption | null>(null);
    const [reportData, setReportData] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeAccordion, setActiveAccordion] = useState<number | null>(null);
    const [chartModal, setChartModal] = useState<ChartModalState>({ isOpen: false, type: null, id: null, name: '' });
    const [_filterOptions, setFilterOptions] = useState<{ studyFields: StudyField[]; variables: Variable[] }>({ studyFields: [], variables: [] });

    useEffect(() => {
        // Limpiar selección/reporte del proyecto anterior -- si no, un
        // proyecto con <2 períodos cerrados dejaría periodA/periodB (y el
        // reporte ya renderizado) apuntando a períodos de OTRO proyecto.
        setPeriodA(null);
        setPeriodB(null);
        setReportData(null);

        const fetchData = async () => {
            const [periodsData, tasksData] = await Promise.all([
                apiFetch<Period[]>(`/api/periods?projectId=${projectId}`),
                apiFetch<{ studyFields: StudyField[]; variables: Variable[] }>(`/api/student-tasks?projectId=${projectId}`),
            ]);
            const closedPeriods = periodsData.filter(p => p.status === 'Closed').map(p => ({ value: p.id, label: p.name }));
            setPeriods(closedPeriods);
            setFilterOptions({ studyFields: tasksData.studyFields, variables: tasksData.variables });
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
            const data = await apiFetch<AnalysisResult>('/api/analysis', { method: 'POST', body: JSON.stringify({ periodAId: periodA.value, periodBId: periodB.value, projectId }) });
            setReportData(data);
        } finally { setIsLoading(false); }
    };

    useEffect(() => {
        if (periodA && periodB) {
            generateReport();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodA, periodB]);

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(value);

    return (
        <div className="space-y-6">
            <Breadcrumbs items={[{ label: 'Panel Admin' }, { label: 'Análisis' }]} />
            <div className="card elev-sm p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <Select<PeriodOption> placeholder="Comparar Período..." options={periods} value={periodA} onChange={(option) => setPeriodA(option)} styles={getReactSelectStyles<PeriodOption>()} />
                <Select<PeriodOption> placeholder="con Período..." options={periods} value={periodB} onChange={(option) => setPeriodB(option)} styles={getReactSelectStyles<PeriodOption>()} />
                <Button onClick={generateReport} disabled={isLoading || !periodA || !periodB} className="w-full">Analizar</Button>
            </div>

            <p className="text-xs text-muted -mt-4">
                Este análisis solo considera variables numéricas de tipo monetario (₲). Variables no monetarias, categóricas, booleanas o de texto no participan del cálculo de "canasta".
            </p>

            {isLoading && <LoadingSpinner />}
            {!isLoading && !reportData && (
                <EmptyState
                    icon={BarChart2}
                    title="Sin análisis generado"
                    description="Selecciona dos períodos cerrados para comenzar el análisis comparativo."
                />
            )}
            {reportData && (() => {
                // Generate sparkline data - simple trend from period A to B
                const sparklineDataA = [
                    { value: reportData.totalCostA * 0.95 },
                    { value: reportData.totalCostA * 0.97 },
                    { value: reportData.totalCostA }
                ];
                const sparklineDataB = [
                    { value: reportData.totalCostB * 0.95 },
                    { value: reportData.totalCostB * 0.97 },
                    { value: reportData.totalCostB }
                ];
                const variationSparkline = reportData.studyFieldAnalysis.slice(0, 6).map(field => ({ value: field.variation }));

                return (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            title={`Canasta (${periodA?.label})`}
                            value={formatCurrency(reportData.totalCostA)}
                            icon={<BarChart2 size={24}/>}
                            color="blue"
                            sparklineData={sparklineDataA}
                        />
                        <StatCard
                            title={`Canasta (${periodB?.label})`}
                            value={formatCurrency(reportData.totalCostB)}
                            icon={<BarChart2 size={24}/>}
                            sparklineData={sparklineDataB}
                        />
                        <StatCard
                            title="Variación Total"
                            value={`${reportData.totalVariation.toFixed(2)}%`}
                            change={reportData.totalVariation}
                            icon={<PieChart size={24}/>}
                            color={reportData.totalVariation >= 0 ? 'red' : 'green'}
                            sparklineData={variationSparkline}
                        />
                    </div>

                    <div className="card elev-sm p-6">
                        <h3 className="text-lg font-medium text-ink mb-4">Análisis por Campo de Estudio</h3>
                        <Accordion
                            type="single"
                            collapsible
                            className="gap-3"
                            value={activeAccordion !== null ? String(activeAccordion) : undefined}
                            onValueChange={(v) => setActiveAccordion(v ? Number(v) : null)}
                        >
                        {reportData.studyFieldAnalysis.map((field, index) => (
                            <AccordionItem key={field.id} value={String(index)} className="card elev-sm p-3">
                                <div className="flex items-center gap-2">
                                    <AccordionTrigger className="flex-1">
                                        <div className="flex items-center gap-4">
                                            <span className="font-medium text-ink">{field.name}</span>
                                            <span className={`font-semibold ${field.variation >= 0 ? 'text-danger' : 'text-success'}`}>{field.variation.toFixed(2)}%</span>
                                        </div>
                                    </AccordionTrigger>
                                    <Tooltip content="Ver evolución histórica">
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => setChartModal({isOpen: true, type: 'studyField', id: field.id, name: field.name})}
                                            className="text-muted hover:text-ink"
                                        >
                                            <AreaChart size={16}/>
                                        </Button>
                                    </Tooltip>
                                </div>
                                <AccordionContent>
                                    <div className="pt-2 mt-1 overflow-x-auto" style={{ borderTop: '1px solid var(--color-divider)' }}>
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="border-b" style={{ borderColor: 'var(--color-divider)' }}>
                                                    <th className="text-left p-2 font-medium text-muted">Variable</th>
                                                    <th className="text-right p-2 font-medium text-muted">Valor Anterior</th>
                                                    <th className="text-right p-2 font-medium text-muted">Valor Actual</th>
                                                    <th className="text-right p-2 font-medium text-muted">Variación</th>
                                                    <th className="text-center p-2 font-medium text-muted">Historial</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {field.variables.map(v => (
                                                    <tr key={v.id} className="border-b last:border-none" style={{ borderColor: 'var(--color-divider)' }}>
                                                        <td className="p-2 text-ink">{v.name}</td>
                                                        <td className="text-right p-2 font-mono text-ink">{formatCurrency(v.valueB)}</td>
                                                        <td className="text-right p-2 font-mono text-ink">{formatCurrency(v.valueA)}</td>
                                                        <td className={`text-right p-2 font-semibold ${v.variation >= 0 ? 'text-danger' : 'text-success'}`}>{v.variation.toFixed(2)}%</td>
                                                        <td className="text-center p-2">
                                                            <Tooltip content="Ver evolución histórica">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon-sm"
                                                                    onClick={() => setChartModal({isOpen: true, type: 'variable', id: v.id, name: v.name})}
                                                                    className="text-muted hover:text-ink"
                                                                >
                                                                    <AreaChart size={16}/>
                                                                </Button>
                                                            </Tooltip>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                        </Accordion>
                    </div>
                </div>
                );
            })()}
            <HistoricalChartModal {...chartModal} projectId={projectId} onClose={() => setChartModal({isOpen: false, type: null, id: null, name: ''})} />
        </div>
    );
};
