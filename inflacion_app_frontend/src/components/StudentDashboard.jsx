import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { Edit3, CheckCircle, ChevronRight, Smile, RadioTower } from 'lucide-react';
import RegistrationWizard from './RegistrationWizard';
import { apiFetch } from '../api';

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full w-full p-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
);

const NoCollectionPanel = () => (
    <div className="bg-white text-gray-800 p-8 rounded-2xl shadow-lg text-center">
        <Smile size={64} className="mx-auto text-blue-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">¡Todo listo por aquí!</h2>
        <p className="text-gray-600">No hay recolecciones disponibles para ti en este momento, ¡nos vemos pronto!</p>
    </div>
);

const CircularProgress = ({ percentage }) => {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative h-12 w-12 flex-shrink-0">
            <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
                <circle cx="24" cy="24" r={radius} className="text-gray-200" strokeWidth="4" fill="transparent" />
                <circle
                    cx="24"
                    cy="24"
                    r={radius}
                    className="text-blue-600"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                {`${Math.round(percentage)}%`}
            </span>
        </div>
    );
};

const RegistrationSummary = ({ products, categories, prices, title }) => {
    const [activeCategory, setActiveCategory] = useState(null);

    const summaryData = useMemo(() => {
        return categories.map(category => {
            const categoryProducts = products.filter(p => p.categoryId === category.id);
            const completedCount = categoryProducts.filter(p => prices[p.id] || prices[p.id] === 0).length;
            return { ...category, products: categoryProducts, completedCount };
        });
    }, [categories, products, prices]);

    return (
        <div className="bg-gray-100 p-4 rounded-2xl space-y-3 mt-4">
            <h4 className="font-bold text-md text-gray-700 mb-2 px-2">{title}</h4>
            {summaryData.map(category => (
                <div key={category.id} className="bg-white p-1 rounded-xl">
                    <div onClick={() => setActiveCategory(prev => prev === category.id ? null : category.id)} className="w-full flex justify-between items-center p-3 text-left cursor-pointer">
                        <h3 className="font-bold text-md text-gray-700">{category.name}</h3>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold text-gray-500">{category.completedCount} / {category.products.length}</span>
                            <ChevronRight size={20} className={`transition-transform ${activeCategory === category.id ? 'rotate-90' : ''}`} />
                        </div>
                    </div>
                    {activeCategory === category.id && (
                        <ul className="space-y-2 p-3 pt-0">
                            {category.products.map(p => (
                                <li key={p.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                                    <p className="font-medium text-gray-600 text-sm">{p.name}</p>
                                    <p className="font-mono font-semibold text-sm text-blue-600">
                                        {(prices[p.id] || prices[p.id] === 0) ? new Intl.NumberFormat('es-PY').format(prices[p.id]) : 'N/A'}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ))}
        </div>
    );
};


function StudentDashboard({ user }) {
    const [dashboardData, setDashboardData] = useState([]);
    const [staticData, setStaticData] = useState({ products: [], categories: [] });
    const [isLoading, setIsLoading] = useState(true);
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
            try {
                await apiFetch('/api/save-draft', { method: 'POST', body: JSON.stringify({ commerceId: editingCommerce.id, prices: draftData }) });
                const newData = await apiFetch('/api/student/dashboard');
                setDashboardData(newData);
            } catch (err) { alert(err.message); }
        }
        setEditingCommerce(null);
    };

    const handleSubmissionSuccess = async () => {
        setEditingCommerce(null);
        const newData = await apiFetch('/api/student/dashboard');
        setDashboardData(newData);
    };
    
    const periodOptions = useMemo(() => dashboardData.map(p => ({ value: p.periodId, label: p.periodName, status: p.status })), [dashboardData]);
    const activePeriodData = useMemo(() => selectedPeriod ? dashboardData.find(p => p.periodId === selectedPeriod.value) : null, [selectedPeriod, dashboardData]);
    const openPeriod = useMemo(() => dashboardData.find(p => p.status === 'Open'), [dashboardData]);
    const goToActivePeriod = () => { if (openPeriod) setSelectedPeriod({ value: openPeriod.periodId, label: openPeriod.periodName, status: openPeriod.status }); };

    if (isLoading) return <LoadingSpinner />;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
    if (dashboardData.length === 0) return <NoCollectionPanel />;

    return (
        <>
            <div className="bg-white text-gray-800 p-6 md:p-8 rounded-2xl shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-3xl font-bold">Tus Tareas</h2>
                    <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                        {openPeriod && selectedPeriod?.value !== openPeriod.periodId && (
                            <button onClick={goToActivePeriod} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-semibold whitespace-nowrap">
                                <RadioTower size={16} /> Ir al período activo
                            </button>
                        )}
                        <div className="w-64 flex-shrink-0">
                            <Select
                                value={selectedPeriod}
                                onChange={setSelectedPeriod}
                                options={periodOptions}
                                styles={{ control: (p) => ({...p, backgroundColor: '#f9fafb', borderRadius: 12}) }}
                                formatOptionLabel={({ label, status }) => (
                                    <div className="flex items-center text-gray-800">
                                        {status === 'Open' && <span className="h-2 w-2 bg-green-500 rounded-full mr-3"></span>}
                                        <span>{label}</span>
                                    </div>
                                )}
                            />
                        </div>
                    </div>
                </div>

                {activePeriodData && (
                    <div className="space-y-3">
                        {activePeriodData.tasks.map(task => {
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
                                <div key={task.commerceId} className="bg-gray-50 hover:bg-gray-100 transition-colors duration-200 p-2 rounded-2xl">
                                    <div onClick={() => setActiveCommerce(prev => prev === task.commerceId ? null : task.commerceId)} className="w-full flex justify-between items-center p-3 text-left cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <CircularProgress percentage={percentage} />
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-800">{task.commerceName}</h3>
                                                <p className={`font-semibold text-sm ${task.status === 'Completado' ? 'text-green-600' : 'text-yellow-600'}`}>{completedCount} / {totalCount} productos</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={24} className={`transition-transform text-gray-500 ${isTaskActive ? 'rotate-90' : ''}`} />
                                    </div>
                                    {isTaskActive && (
                                        <div className="p-3">
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
                <RegistrationWizard
                    commerce={editingCommerce}
                    products={staticData.products}
                    categories={staticData.categories}
                    initialDraft={editingCommerce.initialDraft}
                    onClose={handleCloseWizard}
                    onSubmitSuccess={handleSubmissionSuccess}
                />
            )}
        </>
    );
}

export default StudentDashboard;