import React, { useState, useEffect, useMemo, useRef } from 'react';
import Select from 'react-select';
import { CheckCircle, Clock, Search, ChevronRight, PieChart, Users, ListFilter, Smile, Store, TrendingUp, ArrowUpDown, ChevronLeft, ChevronRight as ChevronRightIcon, SlidersHorizontal, X } from 'lucide-react';
import { apiFetch } from '../api';
import { useTheme } from '../contexts/ThemeContext';
import { getReactSelectStyles } from '../utils/reactSelectStyles';

// --- Componentes de UI Reutilizables ---

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full w-full p-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
    </div>
);

const StatCard = ({ title, value, icon, color = 'blue' }) => (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between hover:shadow-md transition-shadow">
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
        </div>
        <div className={`bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400 p-3 rounded-full`}>{icon}</div>
    </div>
);

const ProgressBar = ({ current, total, size = 'md' }) => {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    const sizeClasses = {
        sm: 'h-1.5',
        md: 'h-2',
        lg: 'h-3'
    };

    return (
        <div className="w-full">
            <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${sizeClasses[size]}`}>
                <div
                    className={`${sizeClasses[size]} rounded-full transition-all duration-300 ${
                        percentage === 100
                            ? 'bg-green-500 dark:bg-green-600'
                            : percentage > 50
                                ? 'bg-yellow-500 dark:bg-yellow-600'
                                : 'bg-blue-500 dark:bg-blue-600'
                    }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

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
        <div className="bg-gray-100 dark:bg-gray-900/30 p-4 rounded-2xl space-y-3 mt-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-bold text-md text-gray-700 dark:text-gray-300 mb-2 px-2">Detalle de Productos</h4>
            {summaryData.map(category => (
                <div key={category.id} className="bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div onClick={() => setActiveCategory(prev => prev === category.id ? null : category.id)} className="w-full flex justify-between items-center p-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition">
                        <div className="flex-1">
                            <h3 className="font-bold text-md text-gray-700 dark:text-gray-200 mb-1">{category.name}</h3>
                            <ProgressBar current={category.completedCount} total={category.products.length} size="sm" />
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{category.completedCount} / {category.products.length}</span>
                            <ChevronRight size={20} className={`transition-transform text-gray-400 dark:text-gray-500 ${activeCategory === category.id ? 'rotate-90' : ''}`} />
                        </div>
                    </div>
                    {activeCategory === category.id && (
                        <ul className="space-y-2 p-3 pt-0">
                            {category.products.map(p => (
                                <li key={p.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-2 rounded-md border border-gray-100 dark:border-gray-700">
                                    <p className="font-medium text-gray-600 dark:text-gray-300 text-sm">{p.name}</p>
                                    <p className="font-mono font-semibold text-sm text-blue-600 dark:text-blue-400">
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

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:px-6 rounded-b-xl">
            <div className="flex justify-between sm:hidden w-full">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Anterior
                </button>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Siguiente
                </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                        Página <span className="font-medium">{currentPage}</span> de{' '}
                        <span className="font-medium">{totalPages}</span>
                    </p>
                </div>
                <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        {startPage > 1 && (
                            <>
                                <button
                                    onClick={() => onPageChange(1)}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    1
                                </button>
                                {startPage > 2 && (
                                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        ...
                                    </span>
                                )}
                            </>
                        )}
                        {pages.map(page => (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                    page === currentPage
                                        ? 'z-10 bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500 text-white'
                                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                        {endPage < totalPages && (
                            <>
                                {endPage < totalPages - 1 && (
                                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        ...
                                    </span>
                                )}
                                <button
                                    onClick={() => onPageChange(totalPages)}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    {totalPages}
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRightIcon size={20} />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
};


function MonitorDashboard({ user }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [monitorData, setMonitorData] = useState([]);
  const [staticData, setStaticData] = useState({ products: [], categories: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [sortBy, setSortBy] = useState('name'); // name, progress, status
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const sortMenuRef = useRef(null);
  const filterMenuRef = useRef(null);

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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortBy, selectedPeriod]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setShowSortMenu(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    if (!activePeriodData) return { totalStudents: 0, completionPercentage: 0, totalTasks: 0, completedTasks: 0 };
    const { students } = activePeriodData;
    const totalStudents = students.length;
    let totalTasks = 0;
    let completedTasks = 0;
    students.forEach(student => {
      totalTasks += student.tasks.length;
      completedTasks += student.tasks.filter(t => t.status === 'Completado').length;
    });
    const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    return { totalStudents, completionPercentage, totalTasks, completedTasks };
  }, [activePeriodData]);

  const sortedAndFilteredStudents = useMemo(() => {
    if (!activePeriodData) return [];

    let students = activePeriodData.students
      .filter(student => student.studentName.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(student => {
        if (statusFilter === 'Todos') return true;
        return student.tasks.some(task => task.status === statusFilter);
      });

    // Sorting
    students = students.map(student => {
      const completedTasksCount = student.tasks.filter(t => t.status === 'Completado').length;
      const totalTasksCount = student.tasks.length;
      const progressPercentage = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;
      return { ...student, completedTasksCount, totalTasksCount, progressPercentage };
    });

    students.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.studentName.localeCompare(b.studentName);
        case 'progress':
          return b.progressPercentage - a.progressPercentage; // Descendente
        case 'status':
          // Primero los que tienen tareas pendientes
          const aHasPending = a.tasks.some(t => t.status !== 'Completado');
          const bHasPending = b.tasks.some(t => t.status !== 'Completado');
          if (aHasPending && !bHasPending) return -1;
          if (!aHasPending && bHasPending) return 1;
          return a.studentName.localeCompare(b.studentName);
        default:
          return 0;
      }
    });

    return students;
  }, [activePeriodData, searchTerm, statusFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedAndFilteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAndFilteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAndFilteredStudents, currentPage, itemsPerPage]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-center p-8 text-red-500 dark:text-red-400">Error: {error}</div>;

  const getStatusChip = (status) => {
    const styles = {
      'Completado': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
      'En Proceso': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
      'Pendiente': 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600'
    };
    const icon = {
        'Completado': <CheckCircle size={14} />,
        'En Proceso': <Clock size={14} />,
        'Pendiente': <div className="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-500" />
    }
    return (
        <div className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 border ${styles[status]}`}>
            {icon[status]}
            <span>{status}</span>
        </div>
    );
  };

  const sortOptions = [
    { value: 'name', label: 'Nombre A-Z' },
    { value: 'progress', label: 'Progreso (mayor a menor)' },
    { value: 'status', label: 'Estado (pendientes primero)' }
  ];

  return (
    <div className="space-y-6">
      {/* Selector de Período */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Período Activo</h2>
        <Select
            placeholder="Seleccionar Período..."
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            options={periodOptions}
            styles={getReactSelectStyles(isDark)}
            formatOptionLabel={({ label, status }) => (
                <div className="flex items-center">
                    {status === 'Open' && <span className="h-2 w-2 bg-green-500 rounded-full mr-3 animate-pulse"></span>}
                    <span>{label}</span>
                </div>
            )}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
            title="Estudiantes Activos"
            value={globalStats.totalStudents}
            icon={<Users size={24} />}
            color="blue"
        />
        <StatCard
            title="Tareas Completadas"
            value={`${globalStats.completedTasks}/${globalStats.totalTasks}`}
            icon={<TrendingUp size={24} />}
            color="green"
        />
        <StatCard
            title="Progreso Global"
            value={`${globalStats.completionPercentage.toFixed(1)}%`}
            icon={<PieChart size={24} />}
            color="teal"
        />
      </div>

      {/* Barra de progreso global */}
      {globalStats.totalTasks > 0 && (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Progreso General del Período</h3>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{globalStats.completionPercentage.toFixed(1)}%</span>
          </div>
          <ProgressBar current={globalStats.completedTasks} total={globalStats.totalTasks} size="lg" />
        </div>
      )}

      {/* Búsqueda y Controles */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
              {/* Búsqueda */}
              <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
                  <input
                      type="text"
                      placeholder="Buscar estudiante..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
                  />
              </div>

              {/* Botón de Ordenamiento */}
              <div className="relative" ref={sortMenuRef}>
                  <button
                      onClick={() => setShowSortMenu(!showSortMenu)}
                      className={`p-2.5 rounded-lg border transition-all ${
                          showSortMenu
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                              : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      title="Ordenar"
                  >
                      <ArrowUpDown size={20} />
                  </button>

                  {showSortMenu && (
                      <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-2">
                          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ordenar por</p>
                          </div>
                          {sortOptions.map(option => (
                              <button
                                  key={option.value}
                                  onClick={() => {
                                      setSortBy(option.value);
                                      setShowSortMenu(false);
                                  }}
                                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                                      sortBy === option.value
                                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold'
                                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                  }`}
                              >
                                  {option.label}
                              </button>
                          ))}
                      </div>
                  )}
              </div>

              {/* Botón de Filtros */}
              <div className="relative" ref={filterMenuRef}>
                  <button
                      onClick={() => setShowFilterMenu(!showFilterMenu)}
                      className={`p-2.5 rounded-lg border transition-all relative ${
                          showFilterMenu
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                              : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      title="Filtrar por estado"
                  >
                      <SlidersHorizontal size={20} />
                      {statusFilter !== 'Todos' && (
                          <span className="absolute -top-1 -right-1 h-3 w-3 bg-blue-600 dark:bg-blue-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                      )}
                  </button>

                  {showFilterMenu && (
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-2">
                          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Filtrar por estado</p>
                              {statusFilter !== 'Todos' && (
                                  <button
                                      onClick={() => setStatusFilter('Todos')}
                                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                      Limpiar
                                  </button>
                              )}
                          </div>
                          {['Todos', 'Completado', 'En Proceso', 'Pendiente'].map(status => (
                              <button
                                  key={status}
                                  onClick={() => {
                                      setStatusFilter(status);
                                      setShowFilterMenu(false);
                                  }}
                                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                                      statusFilter === status
                                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold'
                                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                  }`}
                              >
                                  {status}
                              </button>
                          ))}
                      </div>
                  )}
              </div>
          </div>

          {/* Contador de resultados */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                  {sortedAndFilteredStudents.length} estudiante{sortedAndFilteredStudents.length !== 1 ? 's' : ''}
                  {statusFilter !== 'Todos' && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold">
                          {statusFilter}
                      </span>
                  )}
              </p>
          </div>
      </div>

      {/* Lista de Estudiantes */}
      <div className="space-y-4">
        {paginatedStudents.length > 0 ? (
          <>
            {paginatedStudents.map(student => {
              const { completedTasksCount, totalTasksCount, progressPercentage } = student;
              const isStudentUpToDate = completedTasksCount === totalTasksCount;

              return (
                <div key={student.studentId} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Header del Estudiante */}
                  <div
                    onClick={() => setActiveStudentId(prev => prev === student.studentId ? null : student.studentId)}
                    className="w-full p-4 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 truncate">{student.studentName}</h3>
                          {isStudentUpToDate && (
                              <span className="px-2.5 py-1 text-xs font-bold text-white bg-green-500 dark:bg-green-600 rounded-full shadow-sm flex items-center gap-1">
                                  <CheckCircle size={12} />
                                  Al día
                              </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-2">
                          <div className="flex items-center gap-1.5">
                            <Store size={16} />
                            <span>{totalTasksCount} comercio{totalTasksCount !== 1 ? 's' : ''}</span>
                          </div>
                          <span>•</span>
                          <span className="font-semibold">{completedTasksCount}/{totalTasksCount} completado{completedTasksCount !== 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{progressPercentage.toFixed(0)}%</span>
                        </div>
                        <ProgressBar current={completedTasksCount} total={totalTasksCount} size="md" />
                      </div>
                      <ChevronRight
                        size={24}
                        className={`flex-shrink-0 transition-transform text-gray-400 dark:text-gray-500 ${activeStudentId === student.studentId ? 'rotate-90' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Tareas del Estudiante */}
                  {activeStudentId === student.studentId && (
                    <div className="bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700 p-4">
                      <div className="space-y-3">
                        {student.tasks.map(task => {
                          const currentTaskId = `${student.studentId}-${task.commerceId}`;
                          const isTaskActive = activeTaskId === currentTaskId;
                          const taskPercentage = task.progress.total > 0 ? (task.progress.current / task.progress.total) * 100 : 0;

                          return (
                            <div key={task.commerceId} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                              <div
                                onClick={() => setActiveTaskId(prev => prev === currentTaskId ? null : currentTaskId)}
                                className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                              >
                                <div className="flex-1 min-w-0 mr-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{task.commerceName}</p>
                                    {getStatusChip(task.status)}
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                      {task.progress.current} / {task.progress.total} productos
                                    </span>
                                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                      {taskPercentage.toFixed(0)}%
                                    </span>
                                  </div>
                                  <ProgressBar current={task.progress.current} total={task.progress.total} size="sm" />
                                </div>
                                <ChevronRight
                                  size={20}
                                  className={`flex-shrink-0 transition-transform text-gray-400 dark:text-gray-500 ${isTaskActive ? 'rotate-90' : ''}`}
                                />
                              </div>

                              {isTaskActive && (
                                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
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
                    </div>
                  )}
                </div>
              );
            })}

            {/* Paginación */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        ) : (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <ListFilter size={56} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300">No se encontraron estudiantes</h3>
                <p className="mt-2 text-gray-400 dark:text-gray-500">Prueba a cambiar el filtro o el término de búsqueda.</p>
            </div>
        )}
         {monitorData.length === 0 && !isLoading && (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <Smile size={56} className="mx-auto text-blue-400 dark:text-blue-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300">Todo tranquilo por aquí</h3>
                <p className="mt-2 text-gray-400 dark:text-gray-500">Aún no hay datos de períodos para mostrar.</p>
            </div>
         )}
      </div>
    </div>
  );
}
export default MonitorDashboard;
