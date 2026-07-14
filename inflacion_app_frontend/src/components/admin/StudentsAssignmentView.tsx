import { useState, useEffect } from 'react';
import { Search, Users, Store, X, Plus, ArrowRight } from 'lucide-react';
import { apiFetch } from '../../api';
import { useToast } from '../Toast';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type { ObservationUnit, StudentWithAssignments, StudentsWithAssignmentsResponse } from '../../types/api';

const getErrorStatus = (err: unknown): number | undefined =>
    (err as { response?: { status?: number } })?.response?.status;

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

interface StudentsAssignmentViewProps {
    projectId: number;
}

export const StudentsAssignmentView = ({ projectId }: StudentsAssignmentViewProps) => {
    const [students, setStudents] = useState<StudentWithAssignments[]>([]);
    const [observationUnits, setObservationUnits] = useState<ObservationUnit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState<StudentWithAssignments | null>(null);
    const [searchStudent, setSearchStudent] = useState('');
    const [searchObservationUnit, setSearchObservationUnit] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const toast = useToast();

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch<StudentsWithAssignmentsResponse>(`/api/observation-unit-assignments/students?projectId=${projectId}`);
            setStudents(data.students || []);
            setObservationUnits(data.allObservationUnits || []);
        } catch (err) {
            toast.error(`Error al cargar datos: ${getErrorMessage(err)}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectStudent = (student: StudentWithAssignments) => {
        setSelectedStudent(student);
    };

    const handleAddObservationUnit = async (observationUnitId: number) => {
        if (!selectedStudent) return;

        setIsSaving(true);
        try {
            await apiFetch('/api/observation-unit-assignments/assign', {
                method: 'POST',
                body: JSON.stringify({
                    observationUnitId,
                    studentIds: [selectedStudent.id],
                    projectId
                })
            });
            toast.success('Unidad de observación asignada exitosamente');
            await fetchData();

            // Update selected student with new data
            const updatedData = await apiFetch<StudentsWithAssignmentsResponse>(`/api/observation-unit-assignments/students?projectId=${projectId}`);
            const updatedStudent = updatedData.students.find(s => s.id === selectedStudent.id);
            if (updatedStudent) {
                setSelectedStudent(updatedStudent);
            }
        } catch (err) {
            if (getErrorStatus(err) === 409) {
                toast.warning('Esta unidad de observación ya está asignada al estudiante');
            } else {
                toast.error(`Error al asignar unidad de observación: ${getErrorMessage(err)}`);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveObservationUnit = async (observationUnitId: number) => {
        if (!selectedStudent) return;

        setIsSaving(true);
        try {
            await apiFetch(`/api/observation-unit-assignments/student/${selectedStudent.id}/observation-unit/${observationUnitId}?projectId=${projectId}`, {
                method: 'DELETE'
            });
            toast.success('Asignación eliminada exitosamente');
            await fetchData();

            // Update selected student with new data
            const updatedData = await apiFetch<StudentsWithAssignmentsResponse>(`/api/observation-unit-assignments/students?projectId=${projectId}`);
            const updatedStudent = updatedData.students.find(s => s.id === selectedStudent.id);
            if (updatedStudent) {
                setSelectedStudent(updatedStudent);
            }
        } catch (err) {
            toast.error(`Error al eliminar asignación: ${getErrorMessage(err)}`);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
        s.email.toLowerCase().includes(searchStudent.toLowerCase())
    );

    const assignedObservationUnitIds = selectedStudent?.assignedObservationUnitsData?.map(u => u.id) || [];

    const filteredAvailableObservationUnits = observationUnits
        .filter(u => !assignedObservationUnitIds.includes(u.id))
        .filter(u => u.name.toLowerCase().includes(searchObservationUnit.toLowerCase()));

    const filteredAssignedObservationUnits = selectedStudent?.assignedObservationUnitsData?.filter(u =>
        u.name.toLowerCase().includes(searchObservationUnit.toLowerCase())
    ) || [];

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-gray-700">

                {/* Left Column - Students List */}
                <div className="p-6 space-y-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                            <Users size={20} />
                            Estudiantes
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Selecciona un estudiante para gestionar sus unidades de observación asignadas
                        </p>
                    </div>

                    {/* Search Students */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={searchStudent}
                            onChange={e => setSearchStudent(e.target.value)}
                            placeholder="Buscar estudiante..."
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                        />
                    </div>

                    {/* Students List */}
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                        {filteredStudents.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                No se encontraron estudiantes
                            </div>
                        ) : (
                            filteredStudents.map(student => (
                                <button
                                    key={student.id}
                                    onClick={() => handleSelectStudent(student)}
                                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                        selectedStudent?.id === student.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                                                {student.name}
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                {student.email}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-3">
                                            <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-semibold whitespace-nowrap">
                                                {student.assignedObservationUnitsData?.length || 0}
                                            </div>
                                            {selectedStudent?.id === student.id && (
                                                <ArrowRight size={18} className="text-blue-600 dark:text-blue-400" />
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column - Observation Unit Assignment */}
                <div className="p-6 space-y-4 bg-gray-50 dark:bg-gray-900/30">
                    {!selectedStudent ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[400px] py-12 text-center">
                            <Store size={48} className="text-gray-400 dark:text-gray-600 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                Selecciona un Estudiante
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-500 max-w-xs">
                                Elige un estudiante de la lista izquierda para gestionar sus unidades de observación asignadas
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Search Observation Units */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    value={searchObservationUnit}
                                    onChange={e => setSearchObservationUnit(e.target.value)}
                                    placeholder="Buscar unidad de observación..."
                                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                                />
                            </div>

                            {/* Assigned Observation Units */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                    <Store size={16} />
                                    Unidades Asignadas ({filteredAssignedObservationUnits.length})
                                </h4>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                    {filteredAssignedObservationUnits.length === 0 ? (
                                        <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                            {searchObservationUnit ? 'No se encontraron unidades' : 'No hay unidades asignadas'}
                                        </div>
                                    ) : (
                                        filteredAssignedObservationUnits.map(unit => (
                                            <div
                                                key={unit.id}
                                                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-800 dark:text-gray-100 truncate">
                                                        {unit.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                        {unit.address}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveObservationUnit(unit.id)}
                                                    disabled={isSaving}
                                                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition disabled:opacity-50 ml-3 flex-shrink-0"
                                                    title="Eliminar asignación"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Available Observation Units */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                    <Plus size={16} />
                                    Unidades Disponibles ({filteredAvailableObservationUnits.length})
                                </h4>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                    {filteredAvailableObservationUnits.length === 0 ? (
                                        <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                            {searchObservationUnit ? 'No se encontraron unidades' : 'Todas las unidades están asignadas'}
                                        </div>
                                    ) : (
                                        filteredAvailableObservationUnits.map(unit => (
                                            <div
                                                key={unit.id}
                                                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-800 dark:text-gray-100 truncate">
                                                        {unit.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                        {unit.address}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleAddObservationUnit(unit.id)}
                                                    disabled={isSaving}
                                                    className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition disabled:opacity-50 ml-3 flex-shrink-0"
                                                    title="Asignar unidad de observación"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
