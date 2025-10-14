import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { Edit3, CheckCircle, ChevronRight, Smile, RadioTower } from 'lucide-react';
import LoadingOverlay from './LoadingOverlay';
import { DashboardSkeleton } from './Skeleton';
import { apiFetch } from '../api';
import { useToast } from './Toast';

// Lazy load RegistrationWizard para mejorar el performance del bundle inicial
const RegistrationWizard = lazy(() => import('./RegistrationWizard'));

const NoCollectionPanel = React.memo(() => (
    <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-8 rounded-2xl shadow-lg text-center">
        <Smile size={64} className="mx-auto text-blue-500 dark:text-blue-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2">¡Todo listo por aquí!</h2>
        <p className="text-gray-600 dark:text-gray-400">No hay recolecciones disponibles para ti en este momento, ¡nos vemos pronto!</p>
    </div>
));
NoCollectionPanel.displayName = 'NoCollectionPanel';

const CircularProgress = React.memo(({ percentage }) => {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative h-12 w-12 flex-shrink-0">
            <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
                <circle cx="24" cy="24" r={radius} className="text-gray-200 dark:text-gray-600" strokeWidth="4" fill="transparent" stroke="currentColor" />
                <circle
                    cx="24"
                    cy="24"
                    r={radius}
                    className="text-blue-600 dark:text-blue-400"
                    strokeWidth="4"
                    fill="transparent"
                    stroke="currentColor"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-200">
                {`${Math.round(percentage)}%`}
            </span>
        </div>
    );
});
CircularProgress.displayName = 'CircularProgress';

const RegistrationSummary = ({ products, categories, prices, title }) => {
    const [activeCategory, setActiveCategory] = useState(null);

    const summaryData = useMemo(() => {
        return categories.map(category => {
            const categoryProducts = products.filter(p => p.categoryId === category.id);
            const completedCount = categoryProducts.filter(p => prices[p.id] || prices[p.id] === 0).length;
            const percentage = categoryProducts.length > 0 ? (completedCount / categoryProducts.length) * 100 : 0;
            return { ...category, products: categoryProducts, completedCount, percentage };
        });
    }, [categories, products, prices]);

    return (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-700 p-4 rounded-2xl space-y-3 mt-4 border border-slate-200 dark:border-gray-600">
            <h4 className="font-bold text-md text-gray-800 dark:text-gray-100 mb-2 px-2 flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-blue-500 dark:bg-blue-400"></div>
                {title}
            </h4>
            {summaryData.map(category => {
                const isComplete = category.completedCount === category.products.length && category.products.length > 0;
                const isCategoryActive = activeCategory === category.id;

                return (
                    <div
                        key={category.id}
                        className={`transition-all duration-200 rounded-xl overflow-hidden ${
                            isCategoryActive
                                ? 'bg-white dark:bg-gray-700 shadow-md ring-2 ring-blue-200 dark:ring-blue-500'
                                : 'bg-white dark:bg-gray-700 hover:shadow-sm'
                        }`}
                    >
                        <button
                            onClick={() => setActiveCategory(prev => prev === category.id ? null : category.id)}
                            className="w-full flex justify-between items-start p-3 text-left rounded-xl transition-colors focus:outline-none"
                            aria-expanded={isCategoryActive}
                            aria-label={`${category.name} - ${category.completedCount} de ${category.products.length} productos completados`}
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    isComplete ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'
                                }`}>
                                    <span className={`text-sm font-bold ${isComplete ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300'}`}>
                                        {Math.round(category.percentage)}%
                                    </span>
                                </div>
                                <h3 className="font-bold text-md text-gray-800 dark:text-gray-100 break-words">{category.name}</h3>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <span className={`text-sm font-semibold px-2 py-1 rounded-md ${
                                    isComplete ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-200'
                                }`}>
                                    {category.completedCount} / {category.products.length}
                                </span>
                                <ChevronRight size={20} className={`transition-transform text-gray-400 dark:text-gray-300 ${isCategoryActive ? 'rotate-90' : ''}`} aria-hidden="true" />
                            </div>
                        </button>
                        {isCategoryActive && (
                            <ul className="space-y-2 p-3 pt-0 animate-fade-in">
                                {category.products.map(p => {
                                    const hasPrice = prices[p.id] || prices[p.id] === 0;
                                    return (
                                        <li
                                            key={p.id}
                                            className={`flex justify-between items-center p-3 rounded-lg transition-colors ${
                                                hasPrice ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-700' : 'bg-gray-50 dark:bg-gray-600 border border-gray-200 dark:border-gray-500'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${hasPrice ? 'bg-blue-500 dark:bg-blue-400' : 'bg-gray-300 dark:bg-gray-500'}`}></div>
                                                <p className={`font-medium text-sm truncate ${hasPrice ? 'text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                                    {p.name}
                                                </p>
                                            </div>
                                            <p className={`font-mono font-bold text-sm ml-2 flex-shrink-0 ${
                                                hasPrice ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                                            }`}>
                                                {hasPrice ? new Intl.NumberFormat('es-PY').format(prices[p.id]) : 'N/A'}
                                            </p>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                );
            })}
        </div>
    );
};


function StudentDashboard({ user }) {
    const toast = useToast();
    const [dashboardData, setDashboardData] = useState([]);
    const [staticData, setStaticData] = useState({ products: [], categories: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [editingCommerce, setEditingCommerce] = useState(null);
    const [activeCommerce, setActiveCommerce] = useState(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [periodsData, staticInfo] = await Promise.all([
                    apiFetch('/api/student/dashboard'),
                    apiFetch('/api/student-tasks')
                ]);
                setDashboardData(periodsData);
                setStaticData(staticInfo);
                const openPeriod = periodsData.find(p => p.status === 'Open');
                if (openPeriod) {
                    setSelectedPeriod({ value: openPeriod.periodId, label: openPeriod.periodName, status: openPeriod.status });
                } else if (periodsData.length > 0) {
                    const firstPeriod = periodsData[0];
                    setSelectedPeriod({ value: firstPeriod.periodId, label: firstPeriod.periodName, status: firstPeriod.status });
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    const handleCloseWizard = async (draftData) => {
        if (editingCommerce) {
            setIsSaving(true);
            try {
                await apiFetch('/api/save-draft', { method: 'POST', body: JSON.stringify({ commerceId: editingCommerce.id, prices: draftData }) });
                const newData = await apiFetch('/api/student/dashboard');
                setDashboardData(newData);
                toast.success('Borrador guardado exitosamente');
            } catch (err) {
                toast.error(err.message || 'Error al guardar el borrador');
            } finally {
                setIsSaving(false);
            }
        }
        setEditingCommerce(null);
    };

    const handleSubmissionSuccess = async () => {
        setEditingCommerce(null);
        setIsSaving(true);
        try {
            const newData = await apiFetch('/api/student/dashboard');
            setDashboardData(newData);
            toast.success('¡Precios enviados exitosamente!');
        } catch (err) {
            toast.error(err.message || 'Error al actualizar los datos');
        } finally {
            setIsSaving(false);
        }
    };
    
    const periodOptions = useMemo(() => dashboardData.map(p => ({ value: p.periodId, label: p.periodName, status: p.status })), [dashboardData]);
    const activePeriodData = useMemo(() => selectedPeriod ? dashboardData.find(p => p.periodId === selectedPeriod.value) : null, [selectedPeriod, dashboardData]);
    const openPeriod = useMemo(() => dashboardData.find(p => p.status === 'Open'), [dashboardData]);
    const goToActivePeriod = () => { if (openPeriod) setSelectedPeriod({ value: openPeriod.periodId, label: openPeriod.periodName, status: openPeriod.status }); };

    if (isLoading) return <DashboardSkeleton />;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
    if (dashboardData.length === 0) return <NoCollectionPanel />;

    return (
        <>
            <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-4 sm:p-6 md:p-8 rounded-2xl shadow-lg animate-fade-in">
                <div className="flex flex-col gap-4 mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold">Tus Tareas</h2>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                        {openPeriod && selectedPeriod?.value !== openPeriod.periodId && (
                            <button
                                onClick={goToActivePeriod}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 dark:from-green-600 dark:to-emerald-700 dark:hover:from-green-700 dark:hover:to-emerald-800 text-white rounded-xl text-sm font-semibold whitespace-nowrap order-2 sm:order-1 shadow-md hover:shadow-lg dark:shadow-green-900/50 transition-all duration-200 animate-pulse"
                            >
                                <RadioTower size={16} className="animate-bounce" />
                                <span>Ir al período activo</span>
                            </button>
                        )}
                        <div className="w-full sm:flex-1 md:w-64 md:flex-initial order-1 sm:order-2">
                            <Select
                                value={selectedPeriod}
                                onChange={setSelectedPeriod}
                                options={periodOptions}
                                styles={{
                                    control: (base, state) => ({
                                        ...base,
                                        backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#f9fafb',
                                        borderRadius: 12,
                                        borderColor: state.isFocused
                                            ? (document.documentElement.classList.contains('dark') ? '#3b82f6' : '#3b82f6')
                                            : (document.documentElement.classList.contains('dark') ? '#4b5563' : '#e5e7eb'),
                                        borderWidth: 2,
                                        boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
                                        minHeight: 44,
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            borderColor: document.documentElement.classList.contains('dark') ? '#60a5fa' : '#93c5fd',
                                        }
                                    }),
                                    singleValue: (base) => ({
                                        ...base,
                                        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937',
                                        fontWeight: 600,
                                    }),
                                    menu: (base) => ({
                                        ...base,
                                        backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
                                        borderRadius: 12,
                                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                                        border: document.documentElement.classList.contains('dark') ? '1px solid #374151' : '1px solid #e5e7eb',
                                        overflow: 'hidden',
                                    }),
                                    menuList: (base) => ({
                                        ...base,
                                        padding: 4,
                                    }),
                                    option: (base, state) => ({
                                        ...base,
                                        backgroundColor: state.isSelected
                                            ? (document.documentElement.classList.contains('dark') ? '#3b82f6' : '#3b82f6')
                                            : state.isFocused
                                                ? (document.documentElement.classList.contains('dark') ? '#374151' : '#eff6ff')
                                                : 'transparent',
                                        color: state.isSelected
                                            ? '#ffffff'
                                            : (document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'),
                                        cursor: 'pointer',
                                        borderRadius: 8,
                                        padding: '10px 12px',
                                        fontWeight: state.isSelected ? 600 : 500,
                                        transition: 'all 0.15s',
                                        '&:active': {
                                            backgroundColor: document.documentElement.classList.contains('dark') ? '#2563eb' : '#2563eb',
                                        }
                                    }),
                                    indicatorSeparator: () => ({ display: 'none' }),
                                    dropdownIndicator: (base, state) => ({
                                        ...base,
                                        color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
                                        transition: 'all 0.2s',
                                        transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                        '&:hover': {
                                            color: document.documentElement.classList.contains('dark') ? '#d1d5db' : '#374151',
                                        }
                                    }),
                                }}
                                formatOptionLabel={({ label, status }) => (
                                    <div className="flex items-center">
                                        {status === 'Open' && (
                                            <span className="relative flex h-2 w-2 mr-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                            </span>
                                        )}
                                        <span>{label}</span>
                                    </div>
                                )}
                            />
                        </div>
                    </div>
                </div>

                {activePeriodData && (
                    <div className="space-y-3">
                        {activePeriodData.tasks.map((task, index) => {
                            const prices = task.status === 'Completado' ? task.submittedPrices : task.draftPrices;
                            const completedCount = Object.values(prices).filter(p => p || p === 0).length;
                            const totalCount = staticData.products.length;
                            const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
                            const isTaskActive = activeCommerce === task.commerceId;

                            const ActionButton = () => {
                                if (activePeriodData.status !== 'Open') return null;
                                if (task.status === 'Completado') {
                                    return <button disabled className="w-full px-4 py-3 mb-4 bg-green-500 text-white rounded-xl flex items-center justify-center shadow-md cursor-not-allowed"><CheckCircle size={16} className="mr-2"/> Registro Enviado</button>;
                                }
                                return <button onClick={() => setEditingCommerce({ id: task.commerceId, name: task.commerceName, initialDraft: task.draftPrices })} className="w-full px-4 py-3 mb-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center justify-center shadow-md"><Edit3 size={16} className="mr-2"/> {task.status === 'En Proceso' ? 'Continuar Registro' : 'Iniciar Registro'}</button>;
                            };

                            return (
                                <div
                                    key={task.commerceId}
                                    className={`transition-all duration-300 p-2 rounded-2xl animate-fade-in ${
                                        isTaskActive
                                            ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 shadow-lg ring-2 ring-blue-300 dark:ring-blue-500'
                                            : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 hover:shadow-md'
                                    }`}
                                    style={{ animationDelay: `${index * 0.1}s` }}
                                >
                                    <button
                                        onClick={() => setActiveCommerce(prev => prev === task.commerceId ? null : task.commerceId)}
                                        className="w-full flex justify-between items-center p-3 text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        aria-expanded={isTaskActive}
                                        aria-label={`${task.commerceName} - ${task.status} - ${completedCount} de ${totalCount} productos registrados`}
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                            <CircularProgress percentage={percentage} />
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-bold text-base sm:text-lg text-gray-800 dark:text-gray-100 truncate">{task.commerceName}</h3>
                                                <p className={`font-semibold text-xs sm:text-sm ${task.status === 'Completado' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>{completedCount} / {totalCount} productos</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={20} className={`transition-transform text-gray-500 dark:text-gray-400 flex-shrink-0 ${isTaskActive ? 'rotate-90' : ''}`} aria-hidden="true" />
                                    </button>
                                    {isTaskActive && (
                                        <div className="p-3 animate-fade-in">
                                            <ActionButton />
                                            <RegistrationSummary
                                                products={staticData.products}
                                                categories={staticData.categories}
                                                prices={prices}
                                                title={task.status === 'Completado' ? 'Precios Enviados' : 'Progreso de Registro'}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {editingCommerce && (
                <Suspense fallback={<LoadingOverlay message="Cargando formulario..." />}>
                    <RegistrationWizard
                        commerce={editingCommerce}
                        products={staticData.products}
                        categories={staticData.categories}
                        initialDraft={editingCommerce.initialDraft}
                        onClose={handleCloseWizard}
                        onSubmitSuccess={handleSubmissionSuccess}
                    />
                </Suspense>
            )}

            {isSaving && <LoadingOverlay message="Guardando cambios..." />}
        </>
    );
}

StudentDashboard.propTypes = {
    user: PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        roles: PropTypes.arrayOf(PropTypes.string).isRequired,
    }).isRequired,
};

CircularProgress.propTypes = {
    percentage: PropTypes.number.isRequired,
};

RegistrationSummary.propTypes = {
    products: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        categoryId: PropTypes.number.isRequired,
    })).isRequired,
    categories: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
    })).isRequired,
    prices: PropTypes.object.isRequired,
    title: PropTypes.string.isRequired,
};

export default StudentDashboard;