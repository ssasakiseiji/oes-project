import React, { useState, useEffect, useMemo, useRef } from 'react';
import Select from 'react-select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart2, PieChart, Users, Calendar, Settings, ChevronRight, AreaChart, SlidersHorizontal, Check, X, Edit, Trash2, AlertTriangle, Loader, Filter, Menu, FileText, Database, TrendingUp, ArrowUpDown, Download, Search, Home } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { apiFetch } from '../api';
import { useToast } from './Toast';
import { exportToCSV, exportToExcel } from '../utils/exportUtils';

// =================================================================
// --- Componentes de UI Reutilizables ---
// =================================================================
// Note: Recharts Tooltip imported as RechartsTooltip to avoid naming conflict
// Custom Tooltip component for UI elements

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full w-full p-10">
        <Loader className="animate-spin text-blue-600 dark:text-blue-400" size={40} />
    </div>
);

const EmptyState = ({ icon: Icon, title, description, action }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 animate-fade-in">
            <Icon size={40} className="text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">{description}</p>
        {action}
    </div>
);

const TableSkeleton = ({ rows = 5, columns = 4 }) => (
    <div className="animate-pulse space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4">
                {Array.from({ length: columns }).map((_, j) => (
                    <div key={j} className="h-12 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                ))}
            </div>
        ))}
    </div>
);

const Tooltip = ({ children, content }) => {
    const [isVisible, setIsVisible] = React.useState(false);
    return (
        <div className="relative inline-block">
            <div
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
            >
                {children}
            </div>
            {isVisible && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg whitespace-nowrap z-50 animate-fade-in">
                    {content}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                </div>
            )}
        </div>
    );
};

const Breadcrumbs = ({ items }) => (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <Home size={16} className="text-gray-500 dark:text-gray-500" />
        {items.map((item, index) => (
            <React.Fragment key={index}>
                <ChevronRight size={14} className="text-gray-400 dark:text-gray-600" />
                <span
                    className={`${
                        index === items.length - 1
                            ? 'text-blue-600 dark:text-blue-400 font-semibold'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    } ${item.onClick ? 'cursor-pointer' : ''}`}
                    onClick={item.onClick}
                >
                    {item.label}
                </span>
            </React.Fragment>
        ))}
    </nav>
);

const Pagination = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }) => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="text-sm text-gray-700 dark:text-gray-300">
                Mostrando <span className="font-semibold">{startItem}</span> a <span className="font-semibold">{endItem}</span> de <span className="font-semibold">{totalItems}</span> resultados
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                    Anterior
                </button>
                <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                    Página <span className="font-semibold">{currentPage}</span> de <span className="font-semibold">{totalPages}</span>
                </span>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                    Siguiente
                </button>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, change, icon, color = 'blue', sparklineData = null }) => {
    const colorMap = {
        blue: { stroke: '#3b82f6', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
        green: { stroke: '#10b981', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
        purple: { stroke: '#8b5cf6', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
        orange: { stroke: '#f97316', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
        red: { stroke: '#ef4444', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' }
    };

    const colors = colorMap[color] || colorMap.blue;

    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
                    {change !== null && typeof change !== 'undefined' && (
                        <p className={`text-sm font-semibold flex items-center ${change >= 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {change >= 0 ? '▲' : '▼'} {change.toFixed(2)}%
                        </p>
                    )}
                </div>
                <Tooltip content={title}>
                    <div className={`${colors.bg} ${colors.text} p-3 rounded-full`}>{icon}</div>
                </Tooltip>
            </div>
            {sparklineData && sparklineData.length > 0 && (
                <div className="h-12 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparklineData}>
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke={colors.stroke}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"><X size={20} /></button>
                </header>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">{title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                            Cancelar
                        </button>
                        <button onClick={onConfirm} className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition">
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RoleTag = ({ role }) => {
    const styles = {
        admin: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
        monitor: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
        student: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    };
    return <span className={`px-3 py-1 text-xs font-bold rounded-full ${styles[role] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}>{role}</span>;
};


const getReactSelectStyles = (isDark) => ({
    control: (provided, state) => ({
        ...provided,
        backgroundColor: isDark ? '#374151' : '#f9fafb',
        borderColor: isDark ? (state.isFocused ? '#3b82f6' : '#4b5563') : (state.isFocused ? '#3b82f6' : '#e5e7eb'),
        borderWidth: '1px',
        borderRadius: '0.5rem',
        boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
        '&:hover': {
            borderColor: isDark ? '#60a5fa' : '#93c5fd',
        }
    }),
    singleValue: (provided) => ({
        ...provided,
        color: isDark ? '#f3f4f6' : '#1f2937',
    }),
    input: (provided) => ({
        ...provided,
        color: isDark ? '#f3f4f6' : '#1f2937',
    }),
    menu: (provided) => ({
        ...provided,
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        borderRadius: '0.5rem',
        border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
    }),
    option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isSelected
            ? (isDark ? '#3b82f6' : '#3b82f6')
            : state.isFocused
                ? (isDark ? '#374151' : '#eff6ff')
                : 'transparent',
        color: state.isSelected ? '#ffffff' : (isDark ? '#f3f4f6' : '#1f2937'),
        cursor: 'pointer',
        '&:active': {
            backgroundColor: isDark ? '#2563eb' : '#2563eb',
        }
    }),
    placeholder: (provided) => ({
        ...provided,
        color: isDark ? '#9ca3af' : '#6b7280',
    }),
    multiValue: (provided) => ({
        ...provided,
        backgroundColor: isDark ? '#374151' : '#e5e7eb',
    }),
    multiValueLabel: (provided) => ({
        ...provided,
        color: isDark ? '#f3f4f6' : '#1f2937',
    }),
});

// =================================================================
// --- Vista de Análisis ---
// =================================================================
const AnalysisView = () => {
    const [periods, setPeriods] = useState([]);
    const [periodA, setPeriodA] = useState(null);
    const [periodB, setPeriodB] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeAccordion, setActiveAccordion] = useState(null);
    const [chartModal, setChartModal] = useState({ isOpen: false, type: null, id: null, name: '' });
    const [comparisonData, setComparisonData] = useState([]);
    const [filterOptions, setFilterOptions] = useState({ categories: [], products: [] });
    const isDark = document.documentElement.classList.contains('dark');

    useEffect(() => {
        const fetchData = async () => {
            const [periodsData, tasksData] = await Promise.all([apiFetch('/api/periods'), apiFetch('/api/student-tasks')]);
            const closedPeriods = periodsData.filter(p => p.status === 'Closed').map(p => ({ value: p.id, label: p.name }));
            setPeriods(closedPeriods);
            setFilterOptions({ categories: tasksData.categories, products: tasksData.products });
            if (closedPeriods.length >= 2) {
                setPeriodA(closedPeriods[1]);
                setPeriodB(closedPeriods[0]);
            }
        };
        fetchData();
    }, []);

    const generateReport = async () => {
        if (!periodA || !periodB) return;
        setIsLoading(true);
        setReportData(null);
        try {
            const data = await apiFetch('/api/analysis', { method: 'POST', body: JSON.stringify({ periodAId: periodA.value, periodBId: periodB.value }) });
            setReportData(data);
        } finally { setIsLoading(false); }
    };

    useEffect(() => {
        if (periodA && periodB) {
            generateReport();
        }
    }, [periodA, periodB]);

    const formatCurrency = (value) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(value);

    return (
        <div className="space-y-6">
            <Breadcrumbs items={[{ label: 'Panel Admin' }, { label: 'Análisis' }]} />
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4 items-center animate-fade-in">
                <Select placeholder="Comparar Período..." options={periods} value={periodA} onChange={setPeriodA} styles={getReactSelectStyles(isDark)} />
                <Select placeholder="con Período..." options={periods} value={periodB} onChange={setPeriodB} styles={getReactSelectStyles(isDark)} />
                <button onClick={generateReport} disabled={isLoading || !periodA || !periodB} className="w-full py-2.5 bg-blue-600 dark:bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 transition">Analizar</button>
            </div>

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
                    { value: reportData.totalCostB * 0.95 },
                    { value: reportData.totalCostB * 0.97 },
                    { value: reportData.totalCostB }
                ];
                const sparklineDataB = [
                    { value: reportData.totalCostB },
                    { value: reportData.totalCostB + (reportData.totalCostA - reportData.totalCostB) * 0.5 },
                    { value: reportData.totalCostA }
                ];
                const variationSparkline = reportData.categoryAnalysis.slice(0, 6).map(cat => ({ value: cat.variation }));

                return (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            title={`Canasta (${periodA.label})`}
                            value={formatCurrency(reportData.totalCostB)}
                            icon={<BarChart2 size={24}/>}
                            color="gray"
                            sparklineData={sparklineDataA}
                        />
                        <StatCard
                            title={`Canasta (${periodB.label})`}
                            value={formatCurrency(reportData.totalCostA)}
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
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Análisis por Categoría</h3>
                        <div className="space-y-2">
                        {reportData.categoryAnalysis.map((cat, index) => (
                            <div key={cat.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                <div onClick={() => setActiveAccordion(activeAccordion === index ? null : index)} className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900/70 cursor-pointer transition">
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-gray-800 dark:text-gray-100">{cat.name}</span>
                                        <span className={`font-bold ${cat.variation >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{cat.variation.toFixed(2)}%</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Tooltip content="Ver evolución histórica">
                                            <div onClick={(e) => { e.stopPropagation(); setChartModal({isOpen: true, type: 'category', id: cat.id, name: cat.name})}} className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition cursor-pointer"><AreaChart size={16}/></div>
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
                                                        <th className="text-left p-2 font-medium text-gray-500 dark:text-gray-400">Producto</th>
                                                        <th className="text-right p-2 font-medium text-gray-500 dark:text-gray-400">Precio Anterior</th>
                                                        <th className="text-right p-2 font-medium text-gray-500 dark:text-gray-400">Precio Actual</th>
                                                        <th className="text-right p-2 font-medium text-gray-500 dark:text-gray-400">Variación</th>
                                                        <th className="text-center p-2 font-medium text-gray-500 dark:text-gray-400">Historial</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {cat.products.map(p => (
                                                        <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700 last:border-none">
                                                            <td className="p-2 text-gray-800 dark:text-gray-200">{p.name}</td>
                                                            <td className="text-right p-2 font-mono text-gray-800 dark:text-gray-200">{formatCurrency(p.priceB)}</td>
                                                            <td className="text-right p-2 font-mono text-gray-800 dark:text-gray-200">{formatCurrency(p.priceA)}</td>
                                                            <td className={`text-right p-2 font-bold ${p.variation >= 0 ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>{p.variation.toFixed(2)}%</td>
                                                            <td className="text-center p-2">
                                                                <Tooltip content="Ver evolución histórica">
                                                                    <div onClick={(e) => { e.stopPropagation(); setChartModal({isOpen: true, type: 'product', id: p.id, name: p.name})}} className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full inline-block cursor-pointer transition">
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
            <HistoricalChartModal {...chartModal} onClose={() => setChartModal({isOpen: false, type: null, id: null, name: ''})} />
        </div>
    );
};

const HistoricalChartModal = ({ isOpen, onClose, type, id, name }) => {
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


// =================================================================
// --- Vista de Gestión de Períodos ---
// =================================================================
const PeriodsManager = () => {
    const [periods, setPeriods] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newPeriod, setNewPeriod] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), start_date: '', end_date: '' });
    const toast = useToast();

    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ value: i + 1, name: new Date(0, i).toLocaleString('es-ES', { month: 'long' }) })), []);
    const years = useMemo(() => Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + 1 - i), []);

    useEffect(() => {
        const d = new Date(newPeriod.year, newPeriod.month - 1, 25);
        const startDate = d.toISOString().split('T')[0];
        d.setMonth(d.getMonth() + 1);
        d.setDate(3);
        const endDate = d.toISOString().split('T')[0];
        setNewPeriod(p => ({...p, start_date: startDate, end_date: endDate}));
    }, [newPeriod.month, newPeriod.year]);

    const fetchPeriods = async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch('/api/periods');
            setPeriods(data);
        } catch (err) {
            toast.error(`Error al cargar períodos: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchPeriods(); }, []);

    const handleCreatePeriod = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        const monthName = months.find(m => m.value === newPeriod.month)?.name;
        const periodToCreate = { ...newPeriod, name: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${newPeriod.year}`};
        try {
            await apiFetch('/api/periods', { method: 'POST', body: JSON.stringify(periodToCreate) });
            toast.success('Período creado exitosamente');
            fetchPeriods();
        } catch (err) {
            toast.error(`Error al crear período: ${err.message}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdateStatus = async (periodId, newStatus) => {
        try {
            await apiFetch(`/api/periods/${periodId}/status`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
            toast.success('Estado del período actualizado');
            fetchPeriods();
        } catch (err) {
            toast.error(`Error al actualizar estado: ${err.message}`);
        }
    };

     const getStatusBadge = (status) => {
        const styles = {
            'Open': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
            'Closed': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
            'Scheduled': 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
        };
        const tooltips = {
            'Open': 'Período activo - Los estudiantes pueden registrar precios',
            'Closed': 'Período cerrado - Ya no se pueden registrar precios',
            'Scheduled': 'Período programado - Aún no está activo'
        };
        return (
            <Tooltip content={tooltips[status]}>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${styles[status]}`}>{status}</span>
            </Tooltip>
        );
    };

    return (
        <div className="space-y-6">
            <Breadcrumbs items={[{ label: 'Panel Admin' }, { label: 'Períodos' }]} />
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Crear Nuevo Período</h3>
                <form onSubmit={handleCreatePeriod} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <select
                        value={newPeriod.month}
                        onChange={e => setNewPeriod({...newPeriod, month: parseInt(e.target.value)})}
                        className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                    >
                        {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                    </select>
                    <select
                        value={newPeriod.year}
                        onChange={e => setNewPeriod({...newPeriod, year: parseInt(e.target.value)})}
                        className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Fecha Inicio (sugerida)</label>
                        <input
                            type="date"
                            value={newPeriod.start_date}
                            onChange={e => setNewPeriod({...newPeriod, start_date: e.target.value})}
                            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Fecha Fin (sugerida)</label>
                        <input
                            type="date"
                            value={newPeriod.end_date}
                            onChange={e => setNewPeriod({...newPeriod, end_date: e.target.value})}
                            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isCreating}
                        className="md:col-span-4 w-full p-3 bg-blue-600 dark:bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                        {isCreating ? (
                            <>
                                <Loader className="animate-spin" size={16} />
                                Creando...
                            </>
                        ) : (
                            'Crear Período'
                        )}
                    </button>
                </form>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Historial de Períodos</h3>
                {isLoading ? (
                    <TableSkeleton rows={3} columns={4} />
                ) : periods.length === 0 ? (
                    <EmptyState
                        icon={Calendar}
                        title="No hay períodos registrados"
                        description="Crea tu primer período para comenzar a recopilar datos de precios."
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="p-3 text-gray-500 dark:text-gray-400">Nombre</th>
                                    <th className="p-3 text-gray-500 dark:text-gray-400">Estado</th>
                                    <th className="p-3 text-gray-500 dark:text-gray-400">Fechas</th>
                                    <th className="p-3 text-right text-gray-500 dark:text-gray-400">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {periods.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 last:border-none">
                                    <td className="p-3 font-semibold text-gray-800 dark:text-gray-100">{p.name}</td>
                                    <td className="p-3">{getStatusBadge(p.status)}</td>
                                    <td className="p-3 font-mono text-gray-600 dark:text-gray-400">
                                        {new Date(p.start_date).toLocaleDateString()} - {new Date(p.end_date).toLocaleDateString()}
                                    </td>
                                    <td className="p-3 text-right">
                                        {p.status === 'Scheduled' && (
                                            <button onClick={() => handleUpdateStatus(p.id, 'Open')} className="px-3 py-1 bg-green-500 dark:bg-green-600 text-white rounded-lg text-sm hover:bg-green-600 dark:hover:bg-green-700 transition">
                                                Abrir
                                            </button>
                                        )}
                                        {p.status === 'Open' && (
                                            <button onClick={() => handleUpdateStatus(p.id, 'Closed')} className="px-3 py-1 bg-red-500 dark:bg-red-600 text-white rounded-lg text-sm hover:bg-red-600 dark:hover:bg-red-700 transition">
                                                Cerrar
                                            </button>
                                        )}
                                        {p.status === 'Closed' && (
                                            <span className="text-gray-400 dark:text-gray-500 text-sm">Finalizado</span>
                                        )}
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};


// =================================================================
// --- Vista de Gestión de Registros ---
// =================================================================
const PricesManager = () => {
    const [prices, setPrices] = useState([]);
    const [filters, setFilters] = useState({});
    const [filterOptions, setFilterOptions] = useState({ periods: [], categories: [], products: [], users: [], commerces: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [editingPrice, setEditingPrice] = useState({ id: null, value: '' });
    const [showFilters, setShowFilters] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, priceId: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');
    const itemsPerPage = 10;
    const toast = useToast();
    const isDark = document.documentElement.classList.contains('dark');
    const searchInputRef = useRef(null);

    // Keyboard shortcuts
    useHotkeys('ctrl+k, cmd+k', (e) => {
        e.preventDefault();
        searchInputRef.current?.focus();
    }, { enableOnFormTags: true });

    useHotkeys('ctrl+e, cmd+e', (e) => {
        e.preventDefault();
        if (prices.length > 0) {
            const headers = [
                { key: 'productName', label: 'Producto' },
                { key: 'price', label: 'Precio (₲)' },
                { key: 'commerceName', label: 'Comercio' },
                { key: 'userName', label: 'Estudiante' },
                { key: 'createdAt', label: 'Fecha' }
            ];
            exportToCSV(sortedPrices, 'precios_registrados', headers);
            toast.success('Datos exportados a CSV (Ctrl+E)');
        }
    });

    useHotkeys('ctrl+slash, cmd+slash', (e) => {
        e.preventDefault();
        setShowFilters(prev => !prev);
    });

    useEffect(() => {
        const loadFilterOptions = async () => {
            const [p, t, u] = await Promise.all([apiFetch('/api/periods'), apiFetch('/api/student-tasks'), apiFetch('/api/users')]);
            setFilterOptions({ periods: p, categories: t.categories, products: t.products, users: u, commerces: t.assignedCommerces });
        };
        loadFilterOptions();
    }, []);

    useEffect(() => {
        const fetchPrices = async () => {
            setIsLoading(true);
            const validFilters = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v != null && v !== ''));
            const params = new URLSearchParams(validFilters);
            try {
                const data = await apiFetch(`/api/prices?${params.toString()}`);
                setPrices(data);
            } catch (err) {
                toast.error(`Error al cargar precios: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPrices();
    }, [filters]);

    const handleFilterChange = (key, value) => {
        setCurrentPage(1); // Reset to first page when filters change
        setFilters(prev => {
            const newFilters = { ...prev };
            if (value) {
                newFilters[key] = value;
            } else {
                delete newFilters[key];
            }
            return newFilters;
        });
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedPrices = useMemo(() => {
        let sorted = [...prices];

        // Apply search filter
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            sorted = sorted.filter(p =>
                p.productName?.toLowerCase().includes(search) ||
                p.commerceName?.toLowerCase().includes(search) ||
                p.userName?.toLowerCase().includes(search) ||
                p.price?.toString().includes(search)
            );
        }

        // Apply sorting
        if (sortConfig.key) {
            sorted.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    }, [prices, sortConfig, searchTerm]);

    const paginatedPrices = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedPrices.slice(start, start + itemsPerPage);
    }, [sortedPrices, currentPage]);

    const totalPages = Math.ceil(sortedPrices.length / itemsPerPage);

    const handleSaveEdit = async (priceId) => {
        try {
            await apiFetch(`/api/prices/${priceId}`, { method: 'PUT', body: JSON.stringify({ price: parseFloat(editingPrice.value) }) });
            toast.success('Precio actualizado exitosamente');
            setEditingPrice({ id: null, value: '' });
            setFilters(f => ({...f}));
        } catch (err) {
            toast.error(`Error al actualizar precio: ${err.message}`);
        }
    };

    const handleDelete = async (priceId) => {
        setConfirmModal({ isOpen: true, priceId });
    };

    const confirmDelete = async () => {
        try {
            await apiFetch(`/api/prices/${confirmModal.priceId}`, { method: 'DELETE' });
            toast.success('Registro eliminado exitosamente');
            setConfirmModal({ isOpen: false, priceId: null });
            setFilters(f => ({...f}));
        } catch (err) {
            toast.error(`Error al eliminar registro: ${err.message}`);
        }
    };

    return (
        <>
            <Breadcrumbs items={[{ label: 'Panel Admin' }, { label: 'Registros' }]} />
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4 animate-fade-in">
                <div className="flex justify-between items-center flex-wrap gap-3">
                    <div className="flex items-center gap-4 flex-1">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Auditoría de Registros</h3>
                        <div className="relative max-w-xs flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Buscar por producto, comercio o estudiante... (Ctrl+K)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        {searchTerm && (
                            <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                {sortedPrices.length} resultado{sortedPrices.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Tooltip content="Exportar a CSV (Ctrl+E)">
                            <button
                                onClick={() => {
                                    const headers = [
                                        { key: 'productName', label: 'Producto' },
                                        { key: 'price', label: 'Precio (₲)' },
                                        { key: 'commerceName', label: 'Comercio' },
                                        { key: 'userName', label: 'Estudiante' },
                                        { key: 'createdAt', label: 'Fecha' }
                                    ];
                                    exportToCSV(sortedPrices, 'precios_registrados', headers);
                                    toast.success('Datos exportados a CSV');
                                }}
                                disabled={prices.length === 0}
                                className="flex items-center gap-2 px-3 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-700 dark:hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Download size={16}/> CSV
                            </button>
                        </Tooltip>
                        <Tooltip content="Exportar a Excel">
                            <button
                                onClick={() => {
                                    const headers = [
                                        { key: 'productName', label: 'Producto' },
                                        { key: 'price', label: 'Precio (₲)' },
                                        { key: 'commerceName', label: 'Comercio' },
                                        { key: 'userName', label: 'Estudiante' },
                                        { key: 'createdAt', label: 'Fecha' }
                                    ];
                                    exportToExcel(sortedPrices, 'precios_registrados', headers, 'Precios');
                                    toast.success('Datos exportados a Excel');
                                }}
                                disabled={prices.length === 0}
                                className="flex items-center gap-2 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Download size={16}/> Excel
                            </button>
                        </Tooltip>
                        <Tooltip content="Toggle Filtros (Ctrl+/)">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                            >
                                <Filter size={16}/> Filtros
                            </button>
                        </Tooltip>
                    </div>
                </div>
                {showFilters && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-4 border border-gray-200 dark:border-gray-700">
                        <Select
                            placeholder="Período..."
                            options={filterOptions.periods.map(o=>({value:o.id, label:o.name}))}
                            onChange={v => handleFilterChange('periodId', v?.value)}
                            isClearable
                            styles={getReactSelectStyles(isDark)}
                        />
                        <Select
                            placeholder="Categoría..."
                            options={filterOptions.categories.map(o=>({value:o.id, label:o.name}))}
                            onChange={v => handleFilterChange('categoryId', v?.value)}
                            isClearable
                            styles={getReactSelectStyles(isDark)}
                        />
                        <Select
                            placeholder="Producto..."
                            options={filterOptions.products.map(o=>({value:o.id, label:o.name}))}
                            onChange={v => handleFilterChange('productId', v?.value)}
                            isClearable
                            styles={getReactSelectStyles(isDark)}
                        />
                        <Select
                            placeholder="Estudiante..."
                            options={filterOptions.users.map(o=>({value:o.id, label:o.name}))}
                            onChange={v => handleFilterChange('userId', v?.value)}
                            isClearable
                            styles={getReactSelectStyles(isDark)}
                        />
                        <Select
                            placeholder="Comercio..."
                            options={filterOptions.commerces?.map(o=>({value:o.id, label:o.name})) || []}
                            onChange={v => handleFilterChange('commerceId', v?.value)}
                            isClearable
                            styles={getReactSelectStyles(isDark)}
                        />
                        <label className="flex items-center gap-2 cursor-pointer justify-self-end self-center pr-4">
                            <input
                                type="checkbox"
                                onChange={e => handleFilterChange('showOutliersOnly', e.target.checked)}
                                className="h-4 w-4 rounded form-checkbox text-blue-600 dark:text-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mostrar solo atípicos</span>
                        </label>
                    </div>
                )}
                {isLoading ? (
                    <TableSkeleton rows={5} columns={6} />
                ) : prices.length === 0 ? (
                    <EmptyState
                        icon={Database}
                        title="No hay registros de precios"
                        description="Los estudiantes aún no han registrado precios, o los filtros aplicados no coinciden con ningún registro."
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th onClick={() => handleSort('productName')} className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <div className="flex items-center gap-2">
                                                Producto
                                                <ArrowUpDown size={14} />
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('price')} className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <div className="flex items-center gap-2">
                                                Precio
                                                <ArrowUpDown size={14} />
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('commerceName')} className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <div className="flex items-center gap-2">
                                                Comercio
                                                <ArrowUpDown size={14} />
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('userName')} className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <div className="flex items-center gap-2">
                                                Estudiante
                                                <ArrowUpDown size={14} />
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('periodName')} className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <div className="flex items-center gap-2">
                                                Período
                                                <ArrowUpDown size={14} />
                                            </div>
                                        </th>
                                        <th className="p-3 text-gray-500 dark:text-gray-400">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                {paginatedPrices.map(p => (
                            <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 last:border-none ${p.isOutlier ? 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30' : ''}`}>
                                <td className="p-3 font-semibold text-gray-800 dark:text-gray-100">{p.productName}</td>
                                <td className="p-3 font-mono text-gray-800 dark:text-gray-100">
                                    {editingPrice.id === p.id ? (
                                        <input
                                            type="number"
                                            value={editingPrice.value}
                                            onChange={e => setEditingPrice({...editingPrice, value: e.target.value})}
                                            className="w-24 p-1 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span>{new Intl.NumberFormat('es-PY').format(p.price)}</span>
                                            {p.isOutlier && <AlertTriangle size={16} className="text-yellow-500 dark:text-yellow-400"/>}
                                        </div>
                                    )}
                                </td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{p.commerceName}</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{p.userName}</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{p.periodName}</td>
                                <td className="p-3">
                                    <div className="flex gap-1">
                                        {editingPrice.id === p.id ? (
                                            <>
                                                <Tooltip content="Guardar cambios">
                                                    <button
                                                        onClick={() => handleSaveEdit(p.id)}
                                                        className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full transition"
                                                    >
                                                        <Check size={16} className="text-green-600 dark:text-green-400"/>
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="Cancelar">
                                                    <button
                                                        onClick={() => setEditingPrice({id: null, value:''})}
                                                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition"
                                                    >
                                                        <X size={16} className="text-red-600 dark:text-red-400"/>
                                                    </button>
                                                </Tooltip>
                                            </>
                                        ) : (
                                            <>
                                                <Tooltip content="Editar precio">
                                                    <button
                                                        onClick={() => setEditingPrice({id: p.id, value: p.price})}
                                                        className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition"
                                                    >
                                                        <Edit size={16} className="text-blue-600 dark:text-blue-400"/>
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="Eliminar registro">
                                                    <button
                                                        onClick={() => handleDelete(p.id)}
                                                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition"
                                                    >
                                                        <Trash2 size={16} className="text-red-600 dark:text-red-400"/>
                                                    </button>
                                                </Tooltip>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={sortedPrices.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                        />
                    </>
                )}
            </div>
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, priceId: null })}
                onConfirm={confirmDelete}
                title="Confirmar eliminación"
                message="¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer."
            />
        </>
    );
};

// =================================================================
// --- Vista de Gestión de Usuarios ---
// =================================================================
const UsersManager = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const itemsPerPage = 10;
    const toast = useToast();
    const isDark = document.documentElement.classList.contains('dark');

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch('/api/users');
            setUsers(data);
        } catch (err) {
            toast.error(`Error al cargar usuarios: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleSaveRoles = async (userId, newRoles) => {
        try {
            await apiFetch(`/api/users/${userId}/roles`, { method: 'POST', body: JSON.stringify({ roles: newRoles }) });
            toast.success('Roles actualizados exitosamente');
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            toast.error(`Error al actualizar roles: ${err.message}`);
        }
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredUsers = useMemo(() => {
        return users
            .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .filter(u => !roleFilter || u.roles.includes(roleFilter.value));
    }, [users, searchTerm, roleFilter]);

    const sortedUsers = useMemo(() => {
        let sorted = [...filteredUsers];
        if (sortConfig.key) {
            sorted.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    }, [filteredUsers, sortConfig]);

    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedUsers.slice(start, start + itemsPerPage);
    }, [sortedUsers, currentPage]);

    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roleFilter]);

    return (
        <>
            <Breadcrumbs items={[{ label: 'Panel Admin' }, { label: 'Usuarios' }]} />
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4 animate-fade-in">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Gestión de Usuarios</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 md:col-span-2"
                />
                <Select
                    placeholder="Filtrar por rol..."
                    isClearable
                    options={[
                        {value: 'student', label: 'Estudiante'},
                        {value: 'monitor', label: 'Monitor'},
                        {value: 'admin', label: 'Admin'}
                    ]}
                    onChange={setRoleFilter}
                    styles={getReactSelectStyles(isDark)}
                />
            </div>
            {isLoading ? (
                <TableSkeleton rows={5} columns={4} />
            ) : filteredUsers.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="No se encontraron usuarios"
                    description="No hay usuarios que coincidan con los filtros aplicados."
                />
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th onClick={() => handleSort('name')} className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                        <div className="flex items-center gap-2">
                                            Nombre
                                            <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('email')} className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                        <div className="flex items-center gap-2">
                                            Email
                                            <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th className="p-3 text-gray-500 dark:text-gray-400">Roles</th>
                                    <th className="p-3 text-right text-gray-500 dark:text-gray-400">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                            {paginatedUsers.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 last:border-none">
                            <td className="p-3 font-semibold text-gray-800 dark:text-gray-100">{u.name}</td>
                            <td className="p-3 text-gray-700 dark:text-gray-300">{u.email}</td>
                            <td className="p-3">
                                <div className="flex gap-2">
                                    {u.roles.map(r => <RoleTag key={r} role={r}/>)}
                                </div>
                            </td>
                            <td className="p-3 text-right">
                                <button
                                    onClick={() => setEditingUser(u)}
                                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                                >
                                    Editar Permisos
                                </button>
                            </td>
                        </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={sortedUsers.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                </>
            )}
            <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title={`Editando permisos para ${editingUser?.name}`}>
                {editingUser && <EditRolesForm user={editingUser} onSave={handleSaveRoles} onCancel={() => setEditingUser(null)}/>}
            </Modal>
            </div>
        </>
    );
};

const EditRolesForm = ({ user, onSave, onCancel }) => {
    const [roles, setRoles] = useState(user.roles);
    const allRoles = ['student', 'monitor', 'admin'];
    const handleRoleChange = (role, checked) => {
        if (checked) setRoles(r => [...r, role]);
        else setRoles(r => r.filter(i => i !== role));
    };
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                {allRoles.map(role => (
                    <label key={role} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900/70 transition">
                        <input
                            type="checkbox"
                            checked={roles.includes(role)}
                            onChange={e => handleRoleChange(role, e.target.checked)}
                            className="h-5 w-5 form-checkbox rounded text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600"
                        />
                        <span className="font-semibold capitalize text-gray-800 dark:text-gray-100">{role}</span>
                    </label>
                ))}
            </div>
            <div className="flex justify-end gap-3">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                    Cancelar
                </button>
                <button
                    onClick={() => onSave(user.id, roles)}
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition"
                >
                    Guardar Cambios
                </button>
            </div>
        </div>
    );
};

// =================================================================
// --- Componente Principal del Dashboard de Admin ---
// =================================================================
function AdminDashboard({ user }) {
    const [view, setView] = useState('analysis');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const menuItems = [
        { id: 'analysis', label: 'Análisis', icon: BarChart2 },
        { id: 'periods', label: 'Períodos', icon: Calendar },
        { id: 'records', label: 'Registros', icon: Settings },
        { id: 'users', label: 'Usuarios', icon: Users },
    ];

    return (
        <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 flex font-sans">
            {/* Overlay para móvil */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed md:static inset-y-0 left-0 z-50
                w-64 bg-white dark:bg-gray-800 flex flex-col p-4
                border-r border-gray-200 dark:border-gray-700 shrink-0
                transform transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 px-2">Panel Admin</h1>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                        <X size={20} className="text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
                <nav className="flex-grow space-y-1">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setView(item.id);
                                setIsSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-semibold transition ${
                                view === item.id
                                    ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-lg'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400'
                            }`}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-grow flex flex-col overflow-hidden md:m-4 md:mr-4 md:my-4 md:rounded-2xl md:shadow-xl bg-white dark:bg-gray-800">
                {/* Header con botón hamburger para móvil */}
                <div className="md:hidden border-b border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                        <Menu size={24} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        {menuItems.find(item => item.id === view)?.label}
                    </h2>
                </div>

                {/* Contenido scrolleable */}
                <div className="flex-grow overflow-y-auto p-4 md:p-8 bg-gray-50 dark:bg-gray-900 md:rounded-2xl">
                    <div className="max-w-7xl mx-auto">
                        {view === 'analysis' && <AnalysisView />}
                        {view === 'periods' && <PeriodsManager />}
                        {view === 'records' && <PricesManager />}
                        {view === 'users' && <UsersManager />}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default AdminDashboard;
