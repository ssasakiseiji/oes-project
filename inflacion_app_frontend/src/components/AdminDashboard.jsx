import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart2, PieChart, Users, Calendar, Settings, ChevronRight, AreaChart, SlidersHorizontal, Check, X, Edit, Trash2, AlertTriangle, Loader, Filter } from 'lucide-react';
import { apiFetch } from '../api';

// =================================================================
// --- Componentes de UI Reutilizables ---
// =================================================================

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full w-full p-10">
        <Loader className="animate-spin text-blue-600" size={40} />
    </div>
);

const StatCard = ({ title, value, change, icon, color = 'blue' }) => (
    <div className="bg-white p-5 rounded-xl shadow-sm flex items-center justify-between">
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
             {change !== null && typeof change !== 'undefined' && (
              <p className={`text-sm font-semibold flex items-center ${change >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                {change >= 0 ? '▲' : '▼'} {change.toFixed(2)}%
              </p>
            )}
        </div>
        <div className={`bg-${color}-100 text-${color}-600 p-3 rounded-full`}>{icon}</div>
    </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={20} /></button>
                </header>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

const RoleTag = ({ role }) => {
    const styles = {
        admin: 'bg-red-100 text-red-800',
        monitor: 'bg-yellow-100 text-yellow-800',
        student: 'bg-blue-100 text-blue-800',
    };
    return <span className={`px-3 py-1 text-xs font-bold rounded-full ${styles[role] || 'bg-gray-100 text-gray-800'}`}>{role}</span>;
};


const reactSelectStyles = {
    control: (provided) => ({ ...provided, backgroundColor: '#f9fafb', borderWidth: '1px', borderRadius: '0.5rem' }),
};

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
    const [filterOptions, setFilterOptions] =useState({ categories: [], products: [] });

    useEffect(() => {
        const fetchData = async () => {
            const [periodsData, tasksData] = await Promise.all([apiFetch('/api/periods'), apiFetch('/api/student-tasks')]);
            const closedPeriods = periodsData.filter(p => p.status === 'Closed').map(p => ({ value: p.id, label: p.name }));
            setPeriods(closedPeriods);
            setFilterOptions({ categories: tasksData.categories, products: tasksData.products });
            // --- ¡NUEVO! Carga por defecto de los últimos dos períodos ---
            if (closedPeriods.length >= 2) {
                setPeriodA(closedPeriods[1]); // El penúltimo
                setPeriodB(closedPeriods[0]); // El último
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
    
    // Efecto para generar el reporte automáticamente cuando los períodos por defecto se cargan
    useEffect(() => {
        if (periodA && periodB) {
            generateReport();
        }
    }, [periodA, periodB]);

    const formatCurrency = (value) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(value);

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <Select placeholder="Comparar Período..." options={periods} value={periodA} onChange={setPeriodA} styles={reactSelectStyles} />
                <Select placeholder="con Período..." options={periods} value={periodB} onChange={setPeriodB} styles={reactSelectStyles} />
                <button onClick={generateReport} disabled={isLoading || !periodA || !periodB} className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition">Analizar</button>
            </div>

            {isLoading && <LoadingSpinner />}
            {reportData ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard title={`Canasta (${periodA.label})`} value={formatCurrency(reportData.totalCostB)} icon={<BarChart2 size={24}/>} color="gray"/>
                        <StatCard title={`Canasta (${periodB.label})`} value={formatCurrency(reportData.totalCostA)} icon={<BarChart2 size={24}/>}/>
                        <StatCard title="Variación Total" value={`${reportData.totalVariation.toFixed(2)}%`} change={reportData.totalVariation} icon={<PieChart size={24}/>} color={reportData.totalVariation >= 0 ? 'red' : 'green'}/>
                    </div>
                    
                    <div className="bg-white p-6 rounded-xl shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Análisis por Categoría</h3>
                        <div className="space-y-2">
                        {reportData.categoryAnalysis.map((cat, index) => (
                            <div key={cat.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                <div onClick={() => setActiveAccordion(activeAccordion === index ? null : index)} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer">
                                    <div className="flex items-center gap-4"><span className="font-bold text-gray-800">{cat.name}</span><span className={`font-bold ${cat.variation >= 0 ? 'text-red-600' : 'text-green-600'}`}>{cat.variation.toFixed(2)}%</span></div>
                                    <div className="flex items-center gap-3">
                                        <div onClick={(e) => { e.stopPropagation(); setChartModal({isOpen: true, type: 'category', id: cat.id, name: cat.name})}} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-full"><AreaChart size={16}/></div>
                                        <ChevronRight size={20} className={`transition-transform ${activeAccordion === index ? 'rotate-90' : ''}`} />
                                    </div>
                                </div>
                                {activeAccordion === index && <div className="p-4"><table className="w-full text-sm">
                                    <thead><tr className="border-b border-gray-200"><th className="text-left p-2 font-medium text-gray-500">Producto</th><th className="text-right p-2 font-medium text-gray-500">Precio Anterior</th><th className="text-right p-2 font-medium text-gray-500">Precio Actual</th><th className="text-right p-2 font-medium text-gray-500">Variación</th><th className="text-center p-2 font-medium text-gray-500">Historial</th></tr></thead>
                                    <tbody>{cat.products.map(p => <tr key={p.id} className="border-b border-gray-100 last:border-none">
                                        <td className="p-2">{p.name}</td><td className="text-right p-2 font-mono">{formatCurrency(p.priceB)}</td><td className="text-right p-2 font-mono">{formatCurrency(p.priceA)}</td><td className={`text-right p-2 font-bold ${p.variation >= 0 ? 'text-red-500' : 'text-green-500'}`}>{p.variation.toFixed(2)}%</td>
                                        <td className="text-center p-2"><div onClick={(e) => { e.stopPropagation(); setChartModal({isOpen: true, type: 'product', id: p.id, name: p.name})}} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-full inline-block"><AreaChart size={16}/></div></td>
                                    </tr>)}</tbody>
                                </table></div>}
                            </div>
                        ))}
                        </div>
                    </div>
                </div>
            ) : !isLoading && <div className="text-center py-10 text-gray-500">Selecciona dos períodos para comenzar el análisis.</div>}
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
                <ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis tickFormatter={(val) => new Intl.NumberFormat('es-PY').format(val)}/><Tooltip formatter={(val) => new Intl.NumberFormat('es-PY').format(val)}/><Legend /><Line type="monotone" dataKey="avgPrice" name="Precio Promedio" stroke="#2563eb" strokeWidth={2}/></LineChart></ResponsiveContainer>
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
    const [newPeriod, setNewPeriod] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), start_date: '', end_date: '' });
    
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

    const fetchPeriods = async () => { setIsLoading(true); const data = await apiFetch('/api/periods'); setPeriods(data); setIsLoading(false); };
    useEffect(() => { fetchPeriods(); }, []);

    const handleCreatePeriod = async (e) => {
        e.preventDefault();
        const monthName = months.find(m => m.value === newPeriod.month)?.name;
        const periodToCreate = { ...newPeriod, name: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${newPeriod.year}`};
        try {
            await apiFetch('/api/periods', { method: 'POST', body: JSON.stringify(periodToCreate) });
            fetchPeriods();
        } catch (err) { alert(`Error: ${err.message}`); }
    };

    const handleUpdateStatus = async (periodId, newStatus) => {
        try {
            await apiFetch(`/api/periods/${periodId}/status`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
            fetchPeriods();
        } catch (err) { alert(`Error: ${err.message}`); }
    };

     const getStatusBadge = (status) => {
        const styles = { 'Open': 'bg-green-100 text-green-800', 'Closed': 'bg-red-100 text-red-800', 'Scheduled': 'bg-gray-200 text-gray-800' };
        return <span className={`px-3 py-1 text-xs font-bold rounded-full ${styles[status]}`}>{status}</span>;
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Crear Nuevo Período</h3>
                <form onSubmit={handleCreatePeriod} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <select value={newPeriod.month} onChange={e => setNewPeriod({...newPeriod, month: parseInt(e.target.value)})} className="p-2 border rounded-lg bg-gray-50">{months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}</select>
                    <select value={newPeriod.year} onChange={e => setNewPeriod({...newPeriod, year: parseInt(e.target.value)})} className="p-2 border rounded-lg bg-gray-50">{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
                    <div><label className="text-sm font-medium">Fecha Inicio (sugerida)</label><input type="date" value={newPeriod.start_date} onChange={e => setNewPeriod({...newPeriod, start_date: e.target.value})} className="p-2 border rounded-lg w-full bg-gray-50"/></div>
                    <div><label className="text-sm font-medium">Fecha Fin (sugerida)</label><input type="date" value={newPeriod.end_date} onChange={e => setNewPeriod({...newPeriod, end_date: e.target.value})} className="p-2 border rounded-lg w-full bg-gray-50"/></div>
                    <button type="submit" className="md:col-span-4 w-full p-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition">Crear Período</button>
                </form>
            </div>
             <div className="bg-white p-6 rounded-xl shadow-sm"><h3 className="text-lg font-bold text-gray-800 mb-4">Historial de Períodos</h3>
                <div className="overflow-x-auto"><table className="w-full text-left">
                    <thead><tr><th className="p-3 text-gray-500">Nombre</th><th className="p-3 text-gray-500">Estado</th><th className="p-3 text-gray-500">Fechas</th><th className="p-3 text-right text-gray-500">Acciones</th></tr></thead>
                    <tbody>{periods.map(p => (<tr key={p.id} className="hover:bg-gray-50">
                        <td className="p-3 font-semibold">{p.name}</td><td className="p-3">{getStatusBadge(p.status)}</td>
                        <td className="p-3 font-mono">{new Date(p.start_date).toLocaleDateString()} - {new Date(p.end_date).toLocaleDateString()}</td>
                        <td className="p-3 text-right">{p.status === 'Scheduled' && <button onClick={() => handleUpdateStatus(p.id, 'Open')} className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm">Abrir</button>}{p.status === 'Open' && <button onClick={() => handleUpdateStatus(p.id, 'Closed')} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm">Cerrar</button>}{p.status === 'Closed' && <span className="text-gray-400 text-sm">Finalizado</span>}</td>
                    </tr>))}</tbody>
                </table></div>
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
                console.error("Error fetching prices:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPrices();
    }, [filters]);

    const handleFilterChange = (key, value) => {
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
    
    const handleSaveEdit = async (priceId) => {
        await apiFetch(`/api/prices/${priceId}`, { method: 'PUT', body: JSON.stringify({ price: parseFloat(editingPrice.value) }) });
        setEditingPrice({ id: null, value: '' });
        setFilters(f => ({...f}));
    };
     const handleDelete = async (priceId) => {
        if (window.confirm("¿Estás seguro de que quieres eliminar este registro?")) {
            await apiFetch(`/api/prices/${priceId}`, { method: 'DELETE' });
            setFilters(f => ({...f}));
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Auditoría de Registros</h3>
                <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-semibold"><Filter size={16}/> Filtros</button>
            </div>
            {showFilters && (
                <div className="p-4 bg-gray-50 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Select placeholder="Período..." options={filterOptions.periods.map(o=>({value:o.id, label:o.name}))} onChange={v => handleFilterChange('periodId', v?.value)} isClearable styles={reactSelectStyles}/>
                    <Select placeholder="Categoría..." options={filterOptions.categories.map(o=>({value:o.id, label:o.name}))} onChange={v => handleFilterChange('categoryId', v?.value)} isClearable styles={reactSelectStyles}/>
                    <Select placeholder="Producto..." options={filterOptions.products.map(o=>({value:o.id, label:o.name}))} onChange={v => handleFilterChange('productId', v?.value)} isClearable styles={reactSelectStyles}/>
                    <Select placeholder="Estudiante..." options={filterOptions.users.map(o=>({value:o.id, label:o.name}))} onChange={v => handleFilterChange('userId', v?.value)} isClearable styles={reactSelectStyles}/>
                    <Select placeholder="Comercio..." options={filterOptions.commerces?.map(o=>({value:o.id, label:o.name})) || []} onChange={v => handleFilterChange('commerceId', v?.value)} isClearable styles={reactSelectStyles}/>
                    <label className="flex items-center gap-2 cursor-pointer justify-self-end self-center pr-4">
                        <input type="checkbox" onChange={e => handleFilterChange('showOutliersOnly', e.target.checked)} className="h-4 w-4 rounded form-checkbox text-blue-600"/>
                        <span className="text-sm font-medium">Mostrar solo atípicos</span>
                    </label>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead><tr><th className="p-3 text-gray-500">Producto</th><th className="p-3 text-gray-500">Precio</th><th className="p-3 text-gray-500">Comercio</th><th className="p-3 text-gray-500">Estudiante</th><th className="p-3 text-gray-500">Período</th><th className="p-3 text-gray-500">Acciones</th></tr></thead>
                    <tbody>
                    {isLoading ? <tr><td colSpan="6"><LoadingSpinner /></td></tr> :
                     prices.map(p => (
                        <tr key={p.id} className={`hover:bg-gray-50 ${p.isOutlier ? 'bg-yellow-50 hover:bg-yellow-100' : ''}`}>
                            <td className="p-3 font-semibold">{p.productName}</td>
                            <td className="p-3 font-mono">
                                {editingPrice.id === p.id ? (<input type="number" value={editingPrice.value} onChange={e => setEditingPrice({...editingPrice, value: e.target.value})} className="w-24 p-1 border rounded"/>)
                                : (<div className="flex items-center gap-2"><span>{new Intl.NumberFormat('es-PY').format(p.price)}</span>{p.isOutlier && <AlertTriangle size={16} className="text-yellow-500"/>}</div>)}
                            </td>
                            <td className="p-3">{p.commerceName}</td><td className="p-3">{p.userName}</td><td>{p.periodName}</td>
                            <td className="p-3"><div className="flex gap-1">
                                {editingPrice.id === p.id ? (<><button onClick={() => handleSaveEdit(p.id)} className="p-2 hover:bg-green-100 rounded-full"><Check size={16} className="text-green-600"/></button><button onClick={() => setEditingPrice({id: null, value:''})} className="p-2 hover:bg-red-100 rounded-full"><X size={16} className="text-red-600"/></button></>)
                                : (<><button onClick={() => setEditingPrice({id: p.id, value: p.price})} className="p-2 hover:bg-blue-100 rounded-full"><Edit size={16} className="text-blue-600"/></button><button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-100 rounded-full"><Trash2 size={16} className="text-red-600"/></button></>)}
                            </div></td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
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

    const fetchUsers = async () => { setIsLoading(true); const data = await apiFetch('/api/users'); setUsers(data); setIsLoading(false); };
    useEffect(() => { fetchUsers(); }, []);

    const handleSaveRoles = async (userId, newRoles) => {
        await apiFetch(`/api/users/${userId}/roles`, { method: 'POST', body: JSON.stringify({ roles: newRoles }) });
        setEditingUser(null);
        fetchUsers();
    };
    
    const filteredUsers = useMemo(() => {
        return users
            .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .filter(u => !roleFilter || u.roles.includes(roleFilter.value));
    }, [users, searchTerm, roleFilter]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Gestión de Usuarios</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" placeholder="Buscar por nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="p-2 border rounded-lg bg-gray-50 md:col-span-2" />
                <Select placeholder="Filtrar por rol..." isClearable options={[{value: 'student', label: 'Estudiante'}, {value: 'monitor', label: 'Monitor'}, {value: 'admin', label: 'Admin'}]} onChange={setRoleFilter} styles={reactSelectStyles}/>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead><tr><th className="p-3 text-gray-500">Nombre</th><th className="p-3 text-gray-500">Email</th><th className="p-3 text-gray-500">Roles</th><th className="p-3 text-right text-gray-500">Acciones</th></tr></thead>
                <tbody>
                {isLoading ? <tr><td colSpan="4"><LoadingSpinner /></td></tr> :
                 filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                        <td className="p-3 font-semibold">{u.name}</td>
                        <td className="p-3">{u.email}</td>
                        <td className="p-3"><div className="flex gap-2">{u.roles.map(r => <RoleTag key={r} role={r}/>)}</div></td>
                        <td className="p-3 text-right"><button onClick={() => setEditingUser(u)} className="px-3 py-1 bg-gray-200 text-gray-800 rounded-lg text-sm font-semibold">Editar Permisos</button></td>
                    </tr>
                 ))}
                </tbody>
            </table>
            </div>
            <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title={`Editando permisos para ${editingUser?.name}`}>
                {editingUser && <EditRolesForm user={editingUser} onSave={handleSaveRoles} onCancel={() => setEditingUser(null)}/>}
            </Modal>
        </div>
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
            <div className="space-y-2">{allRoles.map(role => (
                <label key={role} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <input type="checkbox" checked={roles.includes(role)} onChange={e => handleRoleChange(role, e.target.checked)} className="h-5 w-5 form-checkbox rounded text-blue-600"/>
                    <span className="font-semibold capitalize">{role}</span>
                </label>
            ))}</div>
            <div className="flex justify-end gap-3">
                <button onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-lg">Cancelar</button>
                <button onClick={() => onSave(user.id, roles)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Guardar Cambios</button>
            </div>
        </div>
    );
};

// =================================================================
// --- Componente Principal del Dashboard de Admin ---
// =================================================================
function AdminDashboard({ user }) {
  const [view, setView] = useState('analysis');
  const menuItems = [
    { id: 'analysis', label: 'Análisis', icon: BarChart2 },
    { id: 'periods', label: 'Períodos', icon: Calendar },
    { id: 'records', label: 'Registros', icon: Settings },
    { id: 'users', label: 'Usuarios', icon: Users },
  ];

  return (
    <div className="w-full bg-gray-50 flex font-sans">
        <aside className="w-64 bg-white flex flex-col p-4 border-r border-gray-200 shrink-0">
            <h1 className="text-2xl font-bold text-blue-600 mb-8 px-2">Panel Admin</h1>
            <nav className="flex-grow space-y-1">
            {menuItems.map(item => (
                <button key={item.id} onClick={() => setView(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-semibold transition ${view === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-600 hover:bg-blue-100/50 hover:text-blue-600'}`}>
                    <item.icon size={20} />
                    <span>{item.label}</span>
                </button>
            ))}
            </nav>
        </aside>

        <main className="flex-grow p-8 overflow-y-auto h-screen">
            <div className="max-w-7xl mx-auto">
                {view === 'analysis' && <AnalysisView />}
                {view === 'periods' && <PeriodsManager />}
                {view === 'records' && <PricesManager />}
                {view === 'users' && <UsersManager />}
            </div>
        </main>
    </div>
  );
}
export default AdminDashboard;