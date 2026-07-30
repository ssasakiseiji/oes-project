import { useState, useEffect } from 'react';
import { Search, Users, Store, X, Plus, ArrowRight } from 'lucide-react';
import { apiFetch } from '../../api';
import { useToast } from '../Toast';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/button';
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
        <div className="card elev-sm p-0 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">

                {/* Left Column - Students List */}
                <div className="p-6 space-y-4">
                    <div>
                        <h3 className="text-lg font-medium text-ink mb-2 flex items-center gap-2">
                            <Users size={20} />
                            Estudiantes
                        </h3>
                        <p className="text-sm text-muted">
                            Selecciona un estudiante para gestionar sus unidades de observación asignadas
                        </p>
                    </div>

                    {/* Search Students */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                        <input
                            type="text"
                            value={searchStudent}
                            onChange={e => setSearchStudent(e.target.value)}
                            placeholder="Buscar estudiante..."
                            className="input pl-10"
                        />
                    </div>

                    {/* Students List */}
                    <div className="max-h-[600px] overflow-y-auto pr-2">
                        {filteredStudents.length === 0 ? (
                            <div className="text-center py-8 text-muted">
                                No se encontraron estudiantes
                            </div>
                        ) : (
                            filteredStudents.map(student => (
                                <button
                                    key={student.id}
                                    onClick={() => handleSelectStudent(student)}
                                    className={`w-full text-left p-3 flex items-center justify-between gap-2 border-t first:border-t-0 rounded-md transition-colors ${
                                        selectedStudent?.id === student.id ? 'bg-accent-800/40' : 'hover:bg-accent-800/10'
                                    }`}
                                    style={{ borderColor: 'var(--color-divider)' }}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-ink truncate">
                                            {student.name}
                                        </div>
                                        <div className="text-sm text-muted truncate">
                                            {student.email}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                        <span className="tag tag-accent">
                                            {student.assignedObservationUnitsData?.length || 0}
                                        </span>
                                        {selectedStudent?.id === student.id && (
                                            <ArrowRight size={18} className="text-accent-300" />
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column - Observation Unit Assignment */}
                <div className="p-6 space-y-4 border-t lg:border-t-0 lg:border-l" style={{ borderColor: 'var(--color-divider)' }}>
                    {!selectedStudent ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[400px] py-12 text-center">
                            <Store size={48} className="text-muted mb-4" />
                            <h3 className="text-lg font-medium text-ink mb-2">
                                Selecciona un Estudiante
                            </h3>
                            <p className="text-sm text-muted max-w-xs">
                                Elige un estudiante de la lista izquierda para gestionar sus unidades de observación asignadas
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Search Observation Units */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                                <input
                                    type="text"
                                    value={searchObservationUnit}
                                    onChange={e => setSearchObservationUnit(e.target.value)}
                                    placeholder="Buscar unidad de observación..."
                                    className="input pl-10"
                                />
                            </div>

                            {/* Assigned Observation Units */}
                            <div>
                                <h4 className="text-[11px] uppercase tracking-wide text-accent-300 mb-2 flex items-center gap-2">
                                    <Store size={13} />
                                    Unidades Asignadas ({filteredAssignedObservationUnits.length})
                                </h4>
                                <div className="max-h-[200px] overflow-y-auto pr-2">
                                    {filteredAssignedObservationUnits.length === 0 ? (
                                        <div className="text-center py-4 text-sm text-muted">
                                            {searchObservationUnit ? 'No se encontraron unidades' : 'No hay unidades asignadas'}
                                        </div>
                                    ) : (
                                        filteredAssignedObservationUnits.map((unit, i) => (
                                            <div
                                                key={unit.id}
                                                className={`flex items-center justify-between gap-2 py-2 ${i > 0 ? 'border-t' : ''}`}
                                                style={i > 0 ? { borderColor: 'var(--color-divider)' } : undefined}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-ink truncate">
                                                        {unit.name}
                                                    </div>
                                                    <div className="text-xs text-muted truncate">
                                                        {unit.address}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleRemoveObservationUnit(unit.id)}
                                                    disabled={isSaving}
                                                    className="text-danger hover:bg-danger/10 flex-shrink-0"
                                                    title="Eliminar asignación"
                                                >
                                                    <X size={16} />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Available Observation Units */}
                            <div>
                                <h4 className="text-[11px] uppercase tracking-wide text-accent-300 mb-2 flex items-center gap-2">
                                    <Plus size={13} />
                                    Unidades Disponibles ({filteredAvailableObservationUnits.length})
                                </h4>
                                <div className="max-h-[200px] overflow-y-auto pr-2">
                                    {filteredAvailableObservationUnits.length === 0 ? (
                                        <div className="text-center py-4 text-sm text-muted">
                                            {searchObservationUnit ? 'No se encontraron unidades' : 'Todas las unidades están asignadas'}
                                        </div>
                                    ) : (
                                        filteredAvailableObservationUnits.map((unit, i) => (
                                            <div
                                                key={unit.id}
                                                className={`flex items-center justify-between gap-2 py-2 ${i > 0 ? 'border-t' : ''}`}
                                                style={i > 0 ? { borderColor: 'var(--color-divider)' } : undefined}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-ink truncate">
                                                        {unit.name}
                                                    </div>
                                                    <div className="text-xs text-muted truncate">
                                                        {unit.address}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleAddObservationUnit(unit.id)}
                                                    disabled={isSaving}
                                                    className="text-success hover:bg-success/10 flex-shrink-0"
                                                    title="Asignar unidad de observación"
                                                >
                                                    <Plus size={16} />
                                                </Button>
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
