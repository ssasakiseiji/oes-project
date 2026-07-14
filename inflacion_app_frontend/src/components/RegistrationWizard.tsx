import { useState, useEffect, useMemo, useRef, type TouchEvent as ReactTouchEvent } from 'react';
import { ChevronLeft, ChevronRight, List, Send, Edit, X, ArrowLeft, Search } from 'lucide-react';
import { apiFetch } from '../api';
import { useToast } from './Toast';
import LoadingOverlay from './LoadingOverlay';
import type {
    CategoricalVariableConfig,
    NumericVariableConfig,
    ObservationValue,
    ObservationValueMap,
    StudyField,
    TextVariableConfig,
    Variable,
    ValueEntryPayload,
} from '../types/api';
import './RegistrationWizard.css';

// `false` (booleano) es una respuesta válida, no la ausencia de una -- por
// eso se chequea contra null/undefined/'' en vez de truthiness (Fase L).
const hasValidValue = (value: unknown): value is ObservationValue => value != null && value !== '';

function isCurrencyVariable(variable: Variable): boolean {
    return variable.dataType === 'numeric' && !!(variable.config as NumericVariableConfig | null)?.isCurrency;
}

function formatValuePreview(variable: Variable, value: unknown): string {
    if (!hasValidValue(value)) return '';
    switch (variable.dataType) {
        case 'numeric': {
            const num = Number(value);
            if (isNaN(num)) return '';
            return isCurrencyVariable(variable)
                ? `₲ ${new Intl.NumberFormat('es-PY').format(num)}`
                : new Intl.NumberFormat('es-PY').format(num);
        }
        case 'boolean':
            return value ? 'Sí' : 'No';
        default:
            return String(value);
    }
}

interface CustomAlertProps {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const CustomAlert = ({ message, onConfirm, onCancel }: CustomAlertProps) => (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl text-center max-w-sm mx-4 animate-scale-in">
            <p className="text-gray-800 dark:text-gray-100 font-semibold mb-4">{message}</p>
            <div className="flex justify-center gap-4">
                <button onClick={onCancel} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition">Cancelar</button>
                <button onClick={onConfirm} className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition">Confirmar</button>
            </div>
        </div>
    </div>
);

interface SearchModalProps {
    variables: Variable[];
    studyFields: StudyField[];
    values: ObservationValueMap;
    onClose: () => void;
    onSelectVariable: (variableId: number) => void;
}

const SearchModal = ({ variables, studyFields, values, onClose, onSelectVariable }: SearchModalProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    const studyFieldsMap = useMemo(() => {
        const map: Record<number, StudyField> = {};
        studyFields.forEach(f => map[f.id] = f);
        return map;
    }, [studyFields]);

    const filteredVariables = useMemo(() => {
        if (!searchTerm) return variables;
        const term = searchTerm.toLowerCase();
        return variables.filter(v =>
            v.name.toLowerCase().includes(term) ||
            (v.studyFieldId != null && studyFieldsMap[v.studyFieldId]?.name.toLowerCase().includes(term))
        );
    }, [variables, searchTerm, studyFieldsMap]);

    const groupedByStudyField = useMemo(() => {
        const groups: Record<string, Variable[]> = {};
        filteredVariables.forEach(variable => {
            const fieldName = (variable.studyFieldId != null && studyFieldsMap[variable.studyFieldId]?.name) || 'Sin campo de estudio';
            if (!groups[fieldName]) {
                groups[fieldName] = [];
            }
            groups[fieldName].push(variable);
        });
        return groups;
    }, [filteredVariables, studyFieldsMap]);

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Buscar Variable</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por nombre o campo de estudio..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl border-2 border-transparent focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* Variable List */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
                    {Object.keys(groupedByStudyField).length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                            No se encontraron variables
                        </p>
                    ) : (
                        Object.entries(groupedByStudyField).map(([fieldName, fieldVariables]) => (
                            <div key={fieldName}>
                                <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2 px-2">
                                    {fieldName}
                                </h3>
                                <div className="space-y-2">
                                    {fieldVariables.map((variable) => {
                                        const hasValue = hasValidValue(values[variable.id]);
                                        return (
                                            <button
                                                key={variable.id}
                                                onClick={() => onSelectVariable(variable.id)}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                                                    hasValue
                                                        ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
                                                        : 'bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                        hasValue ? 'bg-green-500 dark:bg-green-400' : 'bg-gray-300 dark:bg-gray-500'
                                                    }`}></div>
                                                    <div className="text-left min-w-0 flex-1">
                                                        <p className={`font-semibold text-sm truncate ${
                                                            hasValue ? 'text-green-800 dark:text-green-200' : 'text-gray-700 dark:text-gray-300'
                                                        }`}>
                                                            {variable.name}
                                                        </p>
                                                        {variable.unit && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {variable.unit}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {hasValue ? (
                                                        <div className="text-right">
                                                            <p className="font-mono font-bold text-sm text-green-700 dark:text-green-300">
                                                                {formatValuePreview(variable, values[variable.id])}
                                                            </p>
                                                            <span className="text-xs font-bold text-green-600 dark:text-green-400">✓</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 dark:text-gray-500">Sin valor</span>
                                                    )}
                                                    <ChevronRight size={18} className="text-gray-400 dark:text-gray-500" />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

interface StudyFieldViewProps {
    studyField: StudyField;
    variables: Variable[];
    values: ObservationValueMap;
    onEdit: (index: number) => void;
    onBack: () => void;
}

const StudyFieldView = ({ studyField, variables, values, onEdit, onBack }: StudyFieldViewProps) => {
    const fieldVariables = variables.filter(v => v.studyFieldId === studyField.id);
    const completedCount = fieldVariables.filter(v => hasValidValue(values[v.id])).length;
    const percentage = fieldVariables.length > 0 ? Math.round((completedCount / fieldVariables.length) * 100) : 0;

    return (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-lg max-h-[60vh] overflow-hidden flex flex-col max-w-full">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 p-4 overflow-x-hidden">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-white/90 hover:text-white mb-3 transition"
                >
                    <ArrowLeft size={20} />
                    <span className="text-sm font-medium">Volver al resumen</span>
                </button>
                <h2 className="text-2xl font-bold text-white mb-2">{studyField.name}</h2>
                <div className="flex items-center gap-4 text-white/90">
                    <span className="text-3xl font-bold">{percentage}%</span>
                    <span className="text-sm">{completedCount} de {fieldVariables.length} variables completadas</span>
                </div>
            </div>

            <div className="overflow-y-auto overflow-x-hidden p-4 space-y-2">
                {fieldVariables.map(variable => {
                    const variableIndex = variables.findIndex(v => v.id === variable.id);
                    const hasValue = hasValidValue(values[variable.id]);

                    return (
                        <div
                            key={variable.id}
                            className={`flex justify-between items-center p-4 rounded-xl shadow-sm transition-all ${
                                hasValue
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700'
                                    : 'bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            <div className="flex-1 min-w-0">
                                <p className={`font-semibold text-base ${hasValue ? 'text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {variable.name}
                                </p>
                                {variable.unit && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">({variable.unit})</p>}
                            </div>
                            <div className="flex items-center gap-3">
                                <p className={`font-mono font-bold text-lg ${hasValue ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                    {hasValue ? formatValuePreview(variable, values[variable.id]) : 'Sin valor'}
                                </p>
                                <button
                                    onClick={() => onEdit(variableIndex)}
                                    className="p-2.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition"
                                >
                                    <Edit size={18} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface RegistrationSummaryProps {
    variables: Variable[];
    studyFields: StudyField[];
    values: ObservationValueMap;
    onEdit?: (index: number) => void;
    onStudyFieldClick: (studyFieldId: number) => void;
}

const RegistrationSummary = ({ variables, studyFields, values, onStudyFieldClick }: RegistrationSummaryProps) => {
    const summaryData = useMemo(() => {
        return studyFields.map(field => {
            const fieldVariables = variables.filter(v => v.studyFieldId === field.id);
            const completedCount = fieldVariables.filter(v => hasValidValue(values[v.id])).length;
            const percentage = fieldVariables.length > 0 ? Math.round((completedCount / fieldVariables.length) * 100) : 0;
            return { ...field, variables: fieldVariables, completedCount, totalCount: fieldVariables.length, percentage };
        });
    }, [studyFields, variables, values]);

    const totalCompleted = Object.values(values).filter(hasValidValue).length;
    const totalPercentage = variables.length > 0 ? Math.round((totalCompleted / variables.length) * 100) : 0;

    return (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 md:p-6 rounded-3xl shadow-lg max-h-[60vh] overflow-y-auto overflow-x-hidden space-y-4 max-w-full">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 p-4 rounded-2xl text-white">
                <p className="text-sm opacity-90 mb-1">Progreso Total</p>
                <div className="flex items-end gap-3">
                    <span className="text-4xl font-bold">{totalPercentage}%</span>
                    <span className="text-lg opacity-90 mb-1">{totalCompleted} / {variables.length} variables</span>
                </div>
            </div>

            {summaryData.map(field => {
                const isComplete = field.completedCount === field.totalCount && field.totalCount > 0;
                return (
                    <button
                        key={field.id}
                        onClick={() => onStudyFieldClick(field.id)}
                        className={`w-full transition-all duration-200 rounded-2xl overflow-hidden p-4 text-left ${
                            isComplete
                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 hover:shadow-md'
                                : 'bg-white/60 dark:bg-gray-700/60 hover:bg-white dark:hover:bg-gray-700 hover:shadow-md'
                        }`}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    isComplete ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'
                                }`}>
                                    <span className={`text-sm font-bold ${isComplete ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300'}`}>
                                        {field.percentage}%
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{field.name}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{field.completedCount} de {field.totalCount} variables</p>
                                </div>
                            </div>
                            <ChevronRight size={24} className="text-gray-400 dark:text-gray-500" />
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export interface RegistrationWizardObservationUnit {
    id: number;
    name: string;
}

export interface RegistrationWizardProps {
    observationUnit: RegistrationWizardObservationUnit;
    variables: Variable[];
    studyFields: StudyField[];
    initialDraft?: ObservationValueMap;
    onClose: (values: ObservationValueMap) => void;
    onSubmitSuccess: (observationUnitId: number) => void;
}

interface TouchPoint {
    x: number | null;
    y: number | null;
}

function toValueEntries(values: ObservationValueMap): ValueEntryPayload[] {
    return Object.entries(values)
        .filter(([, value]) => hasValidValue(value))
        .map(([variableId, value]) => ({ variableId: Number(variableId), value }));
}

export default function RegistrationWizard({ observationUnit, variables, studyFields, initialDraft, onClose, onSubmitSuccess }: RegistrationWizardProps) {
    const toast = useToast();
    const [step, setStep] = useState(0);
    const [localValues, setLocalValues] = useState<ObservationValueMap>(() => {
        // Usar initialDraft del servidor; si está vacío, intentar recuperar de localStorage
        if (initialDraft && Object.keys(initialDraft).length > 0) return initialDraft;
        try {
            const saved = localStorage.getItem(`draft_${observationUnit.id}`);
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });
    const [alertInfo, setAlertInfo] = useState<CustomAlertProps | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedStudyFieldId, setSelectedStudyFieldId] = useState<number | null>(null);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const numericInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLTextAreaElement>(null);

    const [touchStart, setTouchStart] = useState<TouchPoint>({ x: null, y: null });
    const [touchEnd, setTouchEnd] = useState<TouchPoint>({ x: null, y: null });
    const minSwipeDistance = 50;

    // Bloquear scroll del body para evitar que se vea/scrollee la pantalla de atrás en móviles
    useEffect(() => {
        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = original; };
    }, []);

    // Guardar borrador en localStorage como respaldo ante pérdida de sesión
    const draftKey = `draft_${observationUnit.id}`;
    useEffect(() => {
        const hasData = Object.values(localValues).some(hasValidValue);
        if (hasData) {
            localStorage.setItem(draftKey, JSON.stringify(localValues));
        }
    }, [localValues, draftKey]);

    const studyFieldsMap = useMemo(() => {
        const map: Record<number, StudyField> = {};
        studyFields.forEach(f => map[f.id] = f);
        return map;
    }, [studyFields]);

    // Sort variables by study field
    const sortedVariables = useMemo(() => {
        return [...variables].sort((a, b) => {
            // First, sort by study field
            const fieldA = a.studyFieldId != null ? studyFieldsMap[a.studyFieldId] : undefined;
            const fieldB = b.studyFieldId != null ? studyFieldsMap[b.studyFieldId] : undefined;

            if (fieldA && fieldB) {
                const fieldComparison = fieldA.name.localeCompare(fieldB.name);
                if (fieldComparison !== 0) return fieldComparison;
            }

            // Then sort by variable name within the same study field
            return a.name.localeCompare(b.name);
        });
    }, [variables, studyFieldsMap]);

    const handleStudyFieldClick = (studyFieldId: number) => {
        setSelectedStudyFieldId(studyFieldId);
    };

    const handleBackToSummary = () => {
        setSelectedStudyFieldId(null);
    };

    const handleSelectVariable = (variableId: number) => {
        const variableIndex = sortedVariables.findIndex(v => v.id === variableId);
        if (variableIndex !== -1) {
            setStep(variableIndex);
            setSelectedStudyFieldId(null);
            setShowSearchModal(false);
        }
    };

    useEffect(() => {
        if (step >= sortedVariables.length) return;
        numericInputRef.current?.focus();
        textInputRef.current?.focus();
    }, [step, sortedVariables.length]);

    const handleValueChange = (variable: Variable, rawValue: string) => {
        if (variable.dataType === 'numeric') {
            // Monetario: solo dígitos (sin centavos, igual que antes). No
            // monetario: dígitos + un único punto decimal (ej. temperatura).
            const cleaned = isCurrencyVariable(variable)
                ? rawValue.replace(/\D/g, '')
                : rawValue.replace(/[^0-9.]/g, '').replace(/(\.\d*)\./g, '$1');
            setLocalValues(prev => ({ ...prev, [variable.id]: cleaned }));
        } else {
            setLocalValues(prev => ({ ...prev, [variable.id]: rawValue }));
        }
    };

    const handleCategoricalSelect = (variable: Variable, option: string) => {
        setLocalValues(prev => ({ ...prev, [variable.id]: prev[variable.id] === option ? '' : option }));
    };

    const handleBooleanSelect = (variable: Variable, value: boolean) => {
        setLocalValues(prev => ({ ...prev, [variable.id]: value }));
    };

    const validateValue = (variable: Variable, rawValue: ObservationValue | undefined) => {
        if (!hasValidValue(rawValue)) return { valid: true, message: '' };
        if (variable.dataType === 'numeric') {
            const num = typeof rawValue === 'string' ? parseFloat(rawValue) : Number(rawValue);
            const cfg = variable.config as NumericVariableConfig | null;
            const max = cfg?.max ?? 99999999;
            if (isNaN(num) || num <= 0) return { valid: false, message: 'El valor debe ser mayor a 0' };
            if (num > max) return { valid: false, message: `El valor no puede superar ${max}` };
            return { valid: true, message: '' };
        }
        if (variable.dataType === 'text') {
            const cfg = variable.config as TextVariableConfig | null;
            if (cfg?.maxLength && String(rawValue).length > cfg.maxLength) {
                return { valid: false, message: `Máximo ${cfg.maxLength} caracteres` };
            }
        }
        return { valid: true, message: '' };
    };

    const handleNext = () => {
        if (step < sortedVariables.length) {
            // Allow advancing even with invalid value (they can skip variables)
            setStep(prev => prev + 1);
        }
    };
    const handlePrev = () => { if (step > 0) setStep(prev => Math.max(prev - 1, 0)); };

    const confirmSubmission = () => {
        const filledCount = Object.values(localValues).filter(hasValidValue).length;
        const confirmationMessage = `Has completado ${filledCount} de ${sortedVariables.length} variables. ¿Deseas enviar el formulario?`;
        setAlertInfo({
            message: confirmationMessage,
            onConfirm: () => { handleSubmit(); setAlertInfo(null); },
            onCancel: () => setAlertInfo(null)
        });
    };

    const handleSubmit = async () => {
        const valuesToSubmit = toValueEntries(localValues);

        setIsSubmitting(true);
        try {
            await apiFetch('/api/observations', {
                method: 'POST',
                body: JSON.stringify({ observationUnitId: observationUnit.id, values: valuesToSubmit }),
                skipAuthRedirect: true,
            });
            localStorage.removeItem(`draft_${observationUnit.id}`);
            onSubmitSuccess(observationUnit.id);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudieron guardar los valores');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (alertInfo || isSubmitting) return; // Don't trigger shortcuts during alerts or submission

            if (e.key === 'Escape') {
                onClose(localValues);
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (step >= sortedVariables.length) {
                    // Summary step - submit
                    confirmSubmission();
                } else {
                    // Variable step - advance to next
                    handleNext();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, alertInfo, isSubmitting, localValues, sortedVariables.length]);

    const onTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
        setTouchEnd({ x: null, y: null });
        setTouchStart({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });
    };

    const onTouchMove = (e: ReactTouchEvent<HTMLDivElement>) => {
        setTouchEnd({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });
    };

    const onTouchEnd = () => {
        if (!touchStart.x || !touchEnd.x) return;

        const distanceX = touchStart.x - touchEnd.x;
        const distanceY = (touchStart.y ?? 0) - (touchEnd.y ?? 0);

        // Check if horizontal swipe is more significant than vertical
        const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

        if (isHorizontalSwipe) {
            if (distanceX > minSwipeDistance) handleNext();
            if (distanceX < -minSwipeDistance) handlePrev();
        }

        setTouchStart({ x: null, y: null });
        setTouchEnd({ x: null, y: null });
    };

    const isSummaryStep = step >= sortedVariables.length;
    const currentVariable = sortedVariables[step];
    const currentValueValidation = currentVariable ? validateValue(currentVariable, localValues[currentVariable.id]) : { valid: true, message: '' };
    const currentIsCurrency = currentVariable ? isCurrencyVariable(currentVariable) : false;

    // Calculate study field breakpoints for progress bar
    const studyFieldBreakpoints = useMemo(() => {
        const breakpoints: { position: number; fieldName: string | undefined }[] = [];
        let lastStudyFieldId: number | null = null;

        sortedVariables.forEach((variable, index) => {
            if (lastStudyFieldId !== null && variable.studyFieldId !== lastStudyFieldId) {
                breakpoints.push({
                    position: (index / sortedVariables.length) * 100,
                    fieldName: variable.studyFieldId != null ? studyFieldsMap[variable.studyFieldId]?.name : undefined
                });
            }
            lastStudyFieldId = variable.studyFieldId;
        });

        return breakpoints;
    }, [sortedVariables, studyFieldsMap]);

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-blue-900 flex flex-col z-50 p-4 overflow-hidden" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
            {alertInfo && <CustomAlert {...alertInfo} />}
            {showSearchModal && (
                <SearchModal
                    variables={sortedVariables}
                    studyFields={studyFields}
                    values={localValues}
                    onClose={() => setShowSearchModal(false)}
                    onSelectVariable={handleSelectVariable}
                />
            )}
            <header className="flex-shrink-0 w-full max-w-2xl mx-auto flex justify-between items-center pt-2 px-2">
                <div className="min-w-0 flex-1 mr-2">
                    <p className="text-white/70 text-xs sm:text-sm">Registrando para:</p>
                    <h2 className="text-white font-bold text-base sm:text-lg truncate">{observationUnit.name}</h2>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => setShowSearchModal(true)}
                        className="p-2 sm:p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                        title="Buscar variable"
                    >
                        <Search size={20}/>
                    </button>
                    <button onClick={() => onClose(localValues)} className="p-2 sm:p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition"><X size={20}/></button>
                </div>
            </header>
            <main className="flex-grow w-full flex flex-col justify-center items-center overflow-x-hidden overflow-y-auto">
                <div key={`${step}-${selectedStudyFieldId}`} className="w-full max-w-2xl text-center slide-item-enter">
                    {isSummaryStep ? (
                        <>
                            <h2 className="text-4xl font-bold text-white mb-2">
                                {selectedStudyFieldId ? 'Campo de Estudio' : 'Resumen Final'}
                            </h2>
                            <p className="text-white/80 mb-8">
                                {selectedStudyFieldId ? 'Edita las variables de este campo de estudio' : 'Revisa los valores antes de enviar.'}
                            </p>
                            {selectedStudyFieldId ? (
                                <StudyFieldView
                                    studyField={studyFieldsMap[selectedStudyFieldId]}
                                    variables={sortedVariables}
                                    values={localValues}
                                    onEdit={(index) => {
                                        setSelectedStudyFieldId(null);
                                        setStep(index);
                                    }}
                                    onBack={handleBackToSummary}
                                />
                            ) : (
                                <RegistrationSummary
                                    variables={sortedVariables}
                                    studyFields={studyFields}
                                    values={localValues}
                                    onEdit={(index) => setStep(index)}
                                    onStudyFieldClick={handleStudyFieldClick}
                                />
                            )}
                        </>
                    ) : (
                        <>
                            <p className="text-base sm:text-lg font-semibold text-white/80 mb-2">{currentVariable.studyFieldId != null ? studyFieldsMap[currentVariable.studyFieldId]?.name : undefined}</p>
                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-3 px-4">{currentVariable.name}</h2>
                            {currentVariable.unit && <p className="text-sm sm:text-base text-white/70 mb-4">({currentVariable.unit})</p>}

                            {currentVariable.dataType === 'numeric' && (
                                <div className="relative w-full max-w-xs sm:max-w-sm mx-auto px-4 mb-2">
                                    {currentIsCurrency && (
                                        <span className="absolute left-6 sm:left-8 top-1/2 -translate-y-1/2 text-white/50 text-2xl sm:text-3xl">₲</span>
                                    )}
                                    <input
                                        ref={numericInputRef}
                                        type="text"
                                        inputMode={currentIsCurrency ? 'numeric' : 'decimal'}
                                        value={
                                            currentIsCurrency
                                                ? (localValues[currentVariable.id] ? new Intl.NumberFormat('es-PY').format(Number(localValues[currentVariable.id])) : '')
                                                : (localValues[currentVariable.id] != null ? String(localValues[currentVariable.id]) : '')
                                        }
                                        onChange={(e) => handleValueChange(currentVariable, e.target.value)}
                                        className={`w-full text-center text-4xl sm:text-5xl md:text-6xl font-bold p-3 sm:p-4 ${currentIsCurrency ? 'pl-12 sm:pl-14' : ''} bg-white/20 text-white rounded-2xl border-2 ${
                                            !currentValueValidation.valid ? 'border-red-400' : 'border-transparent focus:border-white'
                                        } outline-none placeholder-white/50 transition-colors`}
                                        placeholder="0"
                                    />
                                </div>
                            )}

                            {currentVariable.dataType === 'categorical' && (
                                <div className="flex flex-wrap justify-center gap-3 px-4 mb-2">
                                    {((currentVariable.config as CategoricalVariableConfig | null)?.options ?? []).map(option => {
                                        const isSelected = localValues[currentVariable.id] === option;
                                        return (
                                            <button
                                                key={option}
                                                onClick={() => handleCategoricalSelect(currentVariable, option)}
                                                className={`px-5 py-3 rounded-2xl text-lg font-semibold border-2 transition ${
                                                    isSelected
                                                        ? 'bg-white text-blue-600 border-white'
                                                        : 'bg-white/10 text-white border-white/30 hover:bg-white/20'
                                                }`}
                                            >
                                                {option}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {currentVariable.dataType === 'boolean' && (
                                <div className="flex justify-center gap-4 px-4 mb-2">
                                    <button
                                        onClick={() => handleBooleanSelect(currentVariable, true)}
                                        className={`px-8 py-4 rounded-2xl text-2xl font-bold border-2 transition ${
                                            localValues[currentVariable.id] === true
                                                ? 'bg-white text-blue-600 border-white'
                                                : 'bg-white/10 text-white border-white/30 hover:bg-white/20'
                                        }`}
                                    >
                                        Sí
                                    </button>
                                    <button
                                        onClick={() => handleBooleanSelect(currentVariable, false)}
                                        className={`px-8 py-4 rounded-2xl text-2xl font-bold border-2 transition ${
                                            localValues[currentVariable.id] === false
                                                ? 'bg-white text-blue-600 border-white'
                                                : 'bg-white/10 text-white border-white/30 hover:bg-white/20'
                                        }`}
                                    >
                                        No
                                    </button>
                                </div>
                            )}

                            {currentVariable.dataType === 'text' && (
                                <div className="w-full max-w-md mx-auto px-4 mb-2">
                                    <textarea
                                        ref={textInputRef}
                                        value={typeof localValues[currentVariable.id] === 'string' ? localValues[currentVariable.id] as string : ''}
                                        onChange={(e) => handleValueChange(currentVariable, e.target.value)}
                                        rows={4}
                                        className="w-full text-white bg-white/20 rounded-2xl p-4 text-lg outline-none border-2 border-transparent focus:border-white placeholder-white/50 resize-none"
                                        placeholder="Escribe tu respuesta..."
                                    />
                                </div>
                            )}

                            {!currentValueValidation.valid && (
                                <p className="text-red-300 text-sm font-semibold animate-fade-in">{currentValueValidation.message}</p>
                            )}
                            {currentValueValidation.valid && hasValidValue(localValues[currentVariable.id]) && (
                                <p className="text-green-300 text-sm font-semibold animate-fade-in">✓ Valor registrado</p>
                            )}
                        </>
                    )}
                </div>
            </main>
            <footer className="flex-shrink-0 w-full p-3 sm:p-4 md:p-8">
                <div className="w-full max-w-md mx-auto flex flex-col items-center gap-3 sm:gap-4">
                    <div className="w-full space-y-2">
                        <div className="flex justify-between items-center text-white/90 text-sm font-semibold">
                            <span>{isSummaryStep ? 'Resumen' : `${step + 1} de ${sortedVariables.length}`}</span>
                            <span>{Math.round((step / sortedVariables.length) * 100)}%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2.5 relative overflow-visible">
                            {/* Study field breakpoint markers */}
                            {studyFieldBreakpoints.map((breakpoint, index) => (
                                <div
                                    key={index}
                                    className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10"
                                    style={{ left: `${breakpoint.position}%` }}
                                    title={breakpoint.fieldName}
                                >
                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white"></div>
                                </div>
                            ))}
                            {/* Progress bar */}
                            <div className="bg-gradient-to-r from-white to-blue-200 h-2.5 rounded-full transition-all duration-300 shadow-lg" style={{ width: `${(step / sortedVariables.length) * 100}%` }}></div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center w-full gap-2">
                        <button onClick={handlePrev} disabled={step === 0} className="px-3 sm:px-6 py-2 sm:py-3 rounded-full bg-white/20 text-white hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1 sm:gap-2 text-sm sm:text-base"><ChevronLeft size={18} /> <span className="hidden sm:inline">Anterior</span></button>
                        <button onClick={() => setStep(sortedVariables.length)} className="p-2 sm:p-3 rounded-full bg-white/20 text-white hover:bg-white/30 transition" title="Ver resumen"><List size={18} /></button>
                        {isSummaryStep ? (
                            <button onClick={confirmSubmission} className="px-3 sm:px-6 py-2 sm:py-3 bg-green-500 text-white font-bold rounded-full hover:bg-green-600 transition flex items-center shadow-lg gap-1 sm:gap-2 text-sm sm:text-base"><Send size={16} /> Enviar</button>
                        ) : (
                            <button onClick={handleNext} className="px-3 sm:px-6 py-2 sm:py-3 rounded-full bg-white text-blue-600 hover:scale-105 transition shadow-lg flex items-center gap-1 sm:gap-2 text-sm sm:text-base"><span className="hidden sm:inline">Siguiente</span> <ChevronRight size={18} /></button>
                        )}
                    </div>
                </div>
            </footer>

            {isSubmitting && <LoadingOverlay message="Enviando registro..." />}
        </div>
    );
}
