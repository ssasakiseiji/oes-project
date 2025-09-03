import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { CheckCircle, Clock, Search, ChevronRight, PieChart, Users, ListFilter, Smile, RadioTower } from 'lucide-react';
import { apiFetch } from '../api';

// --- Componentes de UI Reutilizables ---

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full w-full p-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
);

const StatCard = ({ title, value, icon, color = 'blue' }) => (
    <div className="bg-white p-5 rounded-xl shadow-sm flex items-center justify-between">
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`bg-${color}-100 text-${color}-600 p-3 rounded-full`}>{icon}</div>
    </div>
);

const RegistrationSummary = ({ products, categories, prices }) => {
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
            <h4 className="font-bold text-md text-gray-700 mb-2 px-2">Progreso del Estudiante</h4>
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


function MonitorDashboard({ user }) {
  const [monitorData, setMonitorData] = useState([]);
  const [staticData, setStaticData] = useState({ products: [], categories: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);

  useEffect(() => {
    const fetchMonitorData = async () => {
      try {
        const [progressData, catalogData] = await Promise.all([
          apiFetch('/api/monitor-data'),
          apiFetch('/api/student-tasks')
        ]);
        setMonitorData(progressData);
        setStaticData({ products: catalogData.products, categories: catalogData.categories });

        const openPeriod = progressData.find(p => p.status === 'Open');
        if (openPeriod) {
            setSelectedPeriod({ value: openPeriod.periodId, label: openPeriod.periodName, status: openPeriod.status });
        } else if (progressData.length > 0) {
            const firstPeriod = progressData[0];
            setSelectedPeriod({ value: firstPeriod.periodId, label: firstPeriod.periodName, status: firstPeriod.status });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMonitorData();
  }, []);
  
  const periodOptions = useMemo(() => monitorData.map(p => ({
      value: p.periodId,
      label: p.periodName,
      status: p.status,
  })), [monitorData]);

  const activePeriodData = useMemo(() => {
      if (!selectedPeriod) return null;
      return monitorData.find(p => p.periodId === selectedPeriod.value);
  }, [selectedPeriod, monitorData]);

  const globalStats = useMemo(() => {
    if (!activePeriodData) return { totalStudents: 0, completionPercentage: 0 };
    const { students } = activePeriodData;
    const totalStudents = students.length;
    let totalTasks = 0;
    let completedTasks = 0;
    students.forEach(student => {
      totalTasks += student.tasks.length;
      completedTasks += student.tasks.filter(t => t.status === 'Completado').length;
    });
    const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    return { totalStudents, completionPercentage };
  }, [activePeriodData]);

  const filteredStudents = useMemo(() => {
    if (!activePeriodData) return [];
    return activePeriodData.students
      .filter(student => student.studentName.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(student => {
        if (statusFilter === 'Todos') return true;
        return student.tasks.some(task => task.status === statusFilter);
      });
  }, [activePeriodData, searchTerm, statusFilter]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;

  const getStatusChip = (status) => {
    const styles = {
      'Completado': 'bg-green-100 text-green-800',
      'En Proceso': 'bg-yellow-100 text-yellow-800',
      'Pendiente': 'bg-gray-200 text-gray-800'
    };
    const icon = {
        'Completado': <CheckCircle size={16} />,
        'En Proceso': <Clock size={16} />,
        'Pendiente': <div className="w-3 h-3 rounded-full bg-gray-400" />
    }
    return (
        <div className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-2 ${styles[status]}`}>
            {icon[status]}
            <span>{status}</span>
        </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
             <Select
                placeholder="Seleccionar Período..."
                value={selectedPeriod}
                onChange={setSelectedPeriod}
                options={periodOptions}
                formatOptionLabel={({ label, status }) => (
                    <div className="flex items-center">
                        {status === 'Open' && <span className="h-2 w-2 bg-green-500 rounded-full mr-3"></span>}
                        <span>{label}</span>
                    </div>
                )}
            />
        </div>
        <StatCard title="Estudiantes en Período" value={globalStats.totalStudents} icon={<Users size={24} />} color="blue" />
        <StatCard title="Progreso del Período" value={`${globalStats.completionPercentage.toFixed(1)}%`} icon={<PieChart size={24} />} color="teal" />
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
          <div className="relative w-full md:w-1/3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="Buscar estudiante..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-full">
              {['Todos', 'Completado', 'En Proceso', 'Pendiente'].map(status => (
                  <button key={status} onClick={() => setStatusFilter(status)}
                          className={`px-4 py-1.5 rounded-full font-semibold text-sm transition ${statusFilter === status ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-white'}`}>
                      {status}
                  </button>
              ))}
          </div>
      </div>

      <div className="space-y-4">
        {filteredStudents.length > 0 ? filteredStudents.map(student => {
          const isStudentUpToDate = student.tasks.every(task => task.status === 'Completado');

          return (
            <div key={student.studentId} className="bg-white p-4 rounded-2xl shadow-sm">
              <div onClick={() => setActiveStudentId(prev => prev === student.studentId ? null : student.studentId)} className="w-full flex justify-between items-center text-left cursor-pointer">
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-xl text-gray-800">{student.studentName}</h3>
                    {isStudentUpToDate && (
                        <span className="px-3 py-1 text-xs font-bold text-white bg-green-500 rounded-full shadow-md">Al día</span>
                    )}
                </div>
                <ChevronRight size={24} className={`transition-transform text-gray-400 ${activeStudentId === student.studentId ? 'rotate-90' : ''}`} />
              </div>

              {activeStudentId === student.studentId && (
                <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-200">
                  {student.tasks.map(task => {
                    const currentTaskId = `${student.studentId}-${task.commerceId}`;
                    const isTaskActive = activeTaskId === currentTaskId;
                    return (
                      <div key={task.commerceId}>
                        <div onClick={() => setActiveTaskId(prev => prev === currentTaskId ? null : currentTaskId)} className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer text-left">
                          <div>
                              <p className="font-semibold text-gray-700">{task.commerceName}</p>
                              <p className="text-sm font-mono text-gray-500">{task.progress.current} / {task.progress.total} productos</p>
                          </div>
                          <div className="flex items-center gap-4">
                             {getStatusChip(task.status)}
                             <ChevronRight size={20} className={`transition-transform text-gray-400 ${isTaskActive ? 'rotate-90' : ''}`} />
                          </div>
                        </div>
                        
                        {isTaskActive && (
                            <div className="p-3">
                                <RegistrationSummary
                                    products={staticData.products}
                                    categories={staticData.categories}
                                    prices={task.draftPrices || {}}
                                />
                            </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }) : (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                <ListFilter size={48} className="mx-auto text-gray-300" />
                <h3 className="mt-2 text-xl font-semibold text-gray-600">No se encontraron estudiantes</h3>
                <p className="mt-1 text-gray-400">Prueba a cambiar el filtro o el término de búsqueda.</p>
            </div>
        )}
         {monitorData.length === 0 && !isLoading && (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                <Smile size={48} className="mx-auto text-blue-400" />
                <h3 className="mt-2 text-xl font-semibold text-gray-600">Todo tranquilo por aquí</h3>
                <p className="mt-1 text-gray-400">Aún no hay datos de períodos para mostrar.</p>
            </div>
         )}
      </div>
    </div>
  );
}
export default MonitorDashboard;