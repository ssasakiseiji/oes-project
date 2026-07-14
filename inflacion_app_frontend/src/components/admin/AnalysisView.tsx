import { useState, useEffect } from 'react';
import Select from 'react-select';
import { BarChart2, PieChart, ChevronRight, AreaChart } from 'lucide-react';
import { apiFetch } from '../../api';
import { getReactSelectStyles } from '../../utils/reactSelectStyles';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Tooltip } from '../ui/Tooltip';
import { StatCard } from '../ui/StatCard';
import { HistoricalChartModal } from '../ui/HistoricalChartModal';
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
    const isDark = document.documentElement.classList.contains('dark');

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
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4 items-center animate-fade-in">
                <Select<PeriodOption> placeholder="Comparar Período..." options={periods} value={periodA} onChange={(option) => setPeriodA(option)} styles={getReactSelectStyles<PeriodOption>(isDark)} />
                <Select<PeriodOption> placeholder="con Período..." options={periods} value={periodB} onChange={(option) => setPeriodB(option)} styles={getReactSelectStyles<PeriodOption>(isDark)} />
                <button onClick={generateReport} disabled={isLoading || !periodA || !periodB} className="w-full py-2.5 bg-blue-600 dark:bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 transition">Analizar</button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-4">
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

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Análisis por Campo de Estudio</h3>
                        <div className="space-y-2">
                        {reportData.studyFieldAnalysis.map((field, index) => (
                            <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                <div onClick={() => setActiveAccordion(activeAccordion === index ? null : index)} className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900/70 cursor-pointer transition">
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-gray-800 dark:text-gray-100">{field.name}</span>
                                        <span className={`font-bold ${field.variation >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{field.variation.toFixed(2)}%</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Tooltip content="Ver evolución histórica">
                                            <div onClick={(e) => { e.stopPropagation(); setChartModal({isOpen: true, type: 'studyField', id: field.id, name: field.name})}} className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition cursor-pointer"><AreaChart size={16}/></div>
                                        </Tooltip>
                                        <ChevronRight size={20} className={`text-gray-400 dark:text-gray-500 transition-transform ${activeAccordion === index ? 'rotate-90' : ''}`} />
                                    </div>
                                </div>
                                {activeAccordion === index && (
                                    <div className="p-4 bg-white dark:bg-gray-800">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                                        <th className="text-left p-2 font-medium text-gray-500 dark:text-gray-400">Variable</th>
                                                        <th className="text-right p-2 font-medium text-gray-500 dark:text-gray-400">Valor Anterior</th>
                                                        <th className="text-right p-2 font-medium text-gray-500 dark:text-gray-400">Valor Actual</th>
                                                        <th className="text-right p-2 font-medium text-gray-500 dark:text-gray-400">Variación</th>
                                                        <th className="text-center p-2 font-medium text-gray-500 dark:text-gray-400">Historial</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {field.variables.map(v => (
                                                        <tr key={v.id} className="border-b border-gray-100 dark:border-gray-700 last:border-none">
                                                            <td className="p-2 text-gray-800 dark:text-gray-200">{v.name}</td>
                                                            <td className="text-right p-2 font-mono text-gray-800 dark:text-gray-200">{formatCurrency(v.valueB)}</td>
                                                            <td className="text-right p-2 font-mono text-gray-800 dark:text-gray-200">{formatCurrency(v.valueA)}</td>
                                                            <td className={`text-right p-2 font-bold ${v.variation >= 0 ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>{v.variation.toFixed(2)}%</td>
                                                            <td className="text-center p-2">
                                                                <Tooltip content="Ver evolución histórica">
                                                                    <div onClick={(e) => { e.stopPropagation(); setChartModal({isOpen: true, type: 'variable', id: v.id, name: v.name})}} className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full inline-block cursor-pointer transition">
                                                                        <AreaChart size={16}/>
                                                                    </div>
                                                                </Tooltip>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        </div>
                    </div>
                </div>
                );
            })()}
            <HistoricalChartModal {...chartModal} projectId={projectId} onClose={() => setChartModal({isOpen: false, type: null, id: null, name: ''})} />
        </div>
    );
};
