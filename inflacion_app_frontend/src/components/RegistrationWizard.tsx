import { useState, useEffect, useMemo, useRef, type TouchEvent as ReactTouchEvent } from 'react';
import { ChevronLeft, ChevronRight, List, Send, Edit, X, ArrowLeft, Search, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../api';
import { useToast } from './Toast';
import LoadingOverlay from './LoadingOverlay';
import Keypad from './student/Keypad';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
    AlertDialogTitle,
} from './ui/alert-dialog';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
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
    <AlertDialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
        <AlertDialogContent size="sm" className="rounded-[var(--nc-radius-lg)]">
            <AlertDialogTitle className="sr-only">Confirmar envío</AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'var(--color-ink)' }} className="font-semibold text-center text-sm">
                {message}
            </AlertDialogDescription>
            <AlertDialogFooter className="justify-center sm:justify-center">
                <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onConfirm}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
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
        <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent
                showCloseButton={false}
                className="rounded-[var(--nc-radius-lg)] w-full max-w-2xl sm:max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-divider)' }}>
                    <DialogTitle style={{ color: 'var(--color-ink)' }} className="text-xl font-medium">Buscar Variable</DialogTitle>
                    <button onClick={onClose} className="btn btn-icon btn-secondary rounded-full" aria-label="Cerrar">
                        <X size={18} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b" style={{ borderColor: 'var(--color-divider)' }}>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por nombre o campo de estudio..."
                            className="input pl-10"
                        />
                    </div>
                </div>

                {/* Variable List */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
                    {Object.keys(groupedByStudyField).length === 0 ? (
                        <p className="text-center text-muted py-8">
                            No se encontraron variables
                        </p>
                    ) : (
                        Object.entries(groupedByStudyField).map(([fieldName, fieldVariables], groupIndex) => (
                            <div key={fieldName} className={groupIndex > 0 ? 'mt-4 pt-3' : ''} style={groupIndex > 0 ? { borderTop: '1px solid var(--color-divider)' } : undefined}>
                                <h3 className="text-sm font-medium text-muted mb-1 px-1">
                                    {fieldName}
                                </h3>
                                {fieldVariables.map((variable) => {
                                    const hasValue = hasValidValue(values[variable.id]);
                                    return (
                                        <button
                                            key={variable.id}
                                            onClick={() => onSelectVariable(variable.id)}
                                            className="w-full flex items-center justify-between py-2.5 px-1 text-left transition-colors hover:text-accent-300"
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hasValue ? 'bg-success' : 'bg-nc-neutral-600'}`} />
                                                <div className="text-left min-w-0 flex-1">
                                                    <p className={`font-medium text-sm truncate ${hasValue ? 'text-ink' : 'text-muted'}`}>
                                                        {variable.name}
                                                    </p>
                                                    {variable.unit && (
                                                        <p className="text-xs text-muted">
                                                            {variable.unit}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {hasValue ? (
                                                    <span className="font-mono text-sm text-success">
                                                        {formatValuePreview(variable, values[variable.id])}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted">Sin valor</span>
                                                )}
                                                <ChevronRight size={16} className="text-muted" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
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
        <div className="card elev-lg max-h-[60vh] overflow-hidden flex flex-col max-w-full p-0 gap-0">
            <div
                className="p-4 overflow-x-hidden"
                style={{ background: 'linear-gradient(160deg, var(--color-section) 0%, var(--color-section-glow) 100%)' }}
            >
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-ink/80 hover:text-ink mb-3 transition"
                >
                    <ArrowLeft size={18} />
                    <span className="text-sm font-medium">Volver al resumen</span>
                </button>
                <h2 className="text-xl font-medium text-ink mb-2">{studyField.name}</h2>
                <div className="flex items-center gap-3 text-ink/90">
                    <span className="text-2xl font-medium">{percentage}%</span>
                    <span className="text-sm">{completedCount} de {fieldVariables.length} variables completadas</span>
                </div>
            </div>

            <div className="overflow-y-auto overflow-x-hidden p-4">
                {fieldVariables.map((variable, i) => {
                    const variableIndex = variables.findIndex(v => v.id === variable.id);
                    const hasValue = hasValidValue(values[variable.id]);

                    return (
                        <div
                            key={variable.id}
                            className="flex justify-between items-center py-2.5"
                            style={i > 0 ? { borderTop: '1px solid var(--color-divider)' } : undefined}
                        >
                            <div className="flex-1 min-w-0">
                                <p className={`font-medium text-sm ${hasValue ? 'text-ink' : 'text-muted'}`}>
                                    {variable.name}
                                </p>
                                {variable.unit && <p className="text-xs text-muted mt-1">({variable.unit})</p>}
                            </div>
                            <div className="flex items-center gap-3">
                                <p className={`font-mono text-sm ${hasValue ? 'text-accent-300' : 'text-muted'}`}>
                                    {hasValue ? formatValuePreview(variable, values[variable.id]) : 'Sin valor'}
                                </p>
                                <button
                                    onClick={() => onEdit(variableIndex)}
                                    className="btn btn-icon btn-secondary rounded-full"
                                >
                                    <Edit size={16} />
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
        <div className="card elev-lg p-4 md:p-6 max-h-[60vh] overflow-y-auto overflow-x-hidden space-y-4 max-w-full">
            <div
                className="p-4 rounded-2xl text-ink"
                style={{ background: 'linear-gradient(160deg, var(--color-section) 0%, var(--color-section-glow) 100%)' }}
            >
                <p className="text-sm opacity-90 mb-1">Progreso Total</p>
                <div className="flex items-end gap-3">
                    <span className="text-3xl font-medium">{totalPercentage}%</span>
                    <span className="text-base opacity-90 mb-1">{totalCompleted} / {variables.length} variables</span>
                </div>
            </div>

            <div>
                {summaryData.map((field, i) => {
                    const isComplete = field.completedCount === field.totalCount && field.totalCount > 0;
                    return (
                        <button
                            key={field.id}
                            onClick={() => onStudyFieldClick(field.id)}
                            className="w-full transition-colors py-3 text-left hover:text-accent-300"
                            style={i > 0 ? { borderTop: '1px solid var(--color-divider)' } : undefined}
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        isComplete ? 'bg-success/15' : 'bg-accent/15'
                                    }`}>
                                        <span className={`text-sm font-bold ${isComplete ? 'text-success' : 'text-accent'}`}>
                                            {field.percentage}%
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-lg text-ink">{field.name}</h3>
                                        <p className="text-sm text-muted">{field.completedCount} de {field.totalCount} variables</p>
                                    </div>
                                </div>
                                <ChevronRight size={22} className="text-muted" />
                            </div>
                        </button>
                    );
                })}
            </div>
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

type WizardPhase = 'form' | 'summary' | 'confirmed';

function toValueEntries(values: ObservationValueMap): ValueEntryPayload[] {
    return Object.entries(values)
        .filter(([, value]) => hasValidValue(value))
        .map(([variableId, value]) => ({ variableId: Number(variableId), value }));
}

export default function RegistrationWizard({ observationUnit, variables, studyFields, initialDraft, onClose, onSubmitSuccess }: RegistrationWizardProps) {
    const toast = useToast();
    const [phase, setPhase] = useState<WizardPhase>('form');
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
    // "Marcar como no disponible" es estado transitorio de UI, no se guarda en
    // ObservationValueMap -- el dominio no tiene un sentinel de "marcado como
    // no disponible" distinto de "vacío", así que no persiste entre visitas
    // (buscar/resumen) al mismo paso. Se resetea a false en cada cambio de step.
    const [isUnavailable, setIsUnavailable] = useState(false);
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

    // Guardar borrador en localStorage como respaldo ante pérdida de sesión.
    // Se detiene una vez confirmado el envío (fase 'confirmed'), como
    // resguardo extra aunque ningún flujo actual mute localValues después.
    const draftKey = `draft_${observationUnit.id}`;
    useEffect(() => {
        if (phase === 'confirmed') return;
        const hasData = Object.values(localValues).some(hasValidValue);
        if (hasData) {
            localStorage.setItem(draftKey, JSON.stringify(localValues));
        }
    }, [localValues, draftKey, phase]);

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

    useEffect(() => {
        setIsUnavailable(false);
    }, [step]);

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
            setPhase('form');
            setSelectedStudyFieldId(null);
            setShowSearchModal(false);
        }
    };

    useEffect(() => {
        if (phase !== 'form') return;
        textInputRef.current?.focus();
    }, [step, phase]);

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

    const handleToggleUnavailable = (checked: boolean) => {
        setIsUnavailable(checked);
        const variable = sortedVariables[step];
        if (checked && variable) {
            setLocalValues(prev => ({ ...prev, [variable.id]: '' }));
        }
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
        if (step < sortedVariables.length - 1) {
            setStep(prev => prev + 1);
        } else {
            setPhase('summary');
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
            setPhase('confirmed');
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

            if (phase === 'confirmed') {
                // Los valores ya se enviaron y el borrador local ya se limpió --
                // Escape/Enter deben volver al panel, no reintentar onClose (que
                // reenviaría un draft obsoleto vía /api/draft-observations).
                if (e.key === 'Escape' || e.key === 'Enter') {
                    e.preventDefault();
                    onSubmitSuccess(observationUnit.id);
                }
                return;
            }

            if (e.key === 'Escape') {
                onClose(localValues);
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (phase === 'summary') {
                    confirmSubmission();
                } else {
                    handleNext();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, phase, alertInfo, isSubmitting, localValues, sortedVariables.length]);

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
        if (phase !== 'form' || !touchStart.x || !touchEnd.x) {
            setTouchStart({ x: null, y: null });
            setTouchEnd({ x: null, y: null });
            return;
        }

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

    const currentVariable = sortedVariables[step];
    const currentValueValidation = currentVariable ? validateValue(currentVariable, localValues[currentVariable.id]) : { valid: true, message: '' };
    const currentIsCurrency = currentVariable ? isCurrencyVariable(currentVariable) : false;
    const nextLabel = step === sortedVariables.length - 1 ? 'Ver resumen' : 'Siguiente';

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

    const numericRawValue = currentVariable && typeof localValues[currentVariable.id] === 'string'
        ? localValues[currentVariable.id] as string
        : '';
    const numericDisplayText = currentIsCurrency
        ? (numericRawValue ? new Intl.NumberFormat('es-PY').format(Number(numericRawValue)) : '0')
        : (numericRawValue || '0');

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col overflow-hidden"
            style={{ background: 'var(--color-bg)' }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
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

            {phase === 'form' && currentVariable && (
                <>
                    <header className="flex-none px-4 pt-4 pb-3 flex items-center gap-2.5 border-b" style={{ borderColor: 'var(--color-divider)' }}>
                        <button type="button" onClick={() => onClose(localValues)} className="btn btn-icon btn-secondary rounded-full" aria-label="Cerrar">
                            <X size={16} />
                        </button>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-ink truncate">{observationUnit.name}</p>
                            <p className="text-xs text-muted">Paso {step + 1} de {sortedVariables.length}</p>
                        </div>
                        <button type="button" onClick={() => setShowSearchModal(true)} className="btn btn-icon btn-secondary rounded-full" aria-label="Buscar variable">
                            <Search size={16} />
                        </button>
                    </header>

                    <main className="flex-1 w-full flex flex-col justify-center items-center overflow-x-hidden overflow-y-auto px-4 py-6">
                        <div key={`form-${step}`} className="w-full max-w-sm text-center slide-item-enter">
                            <span className="tag tag-outline mb-3">
                                {currentVariable.studyFieldId != null ? studyFieldsMap[currentVariable.studyFieldId]?.name : 'Sin campo de estudio'}
                            </span>
                            <h3 className="text-2xl sm:text-3xl font-medium text-ink mb-1 mt-2">{currentVariable.name}</h3>
                            {currentVariable.unit && <p className="text-sm text-muted mb-5">{currentVariable.unit}</p>}

                            {currentVariable.dataType === 'numeric' && (
                                <div className="mb-5">
                                    <div className="field text-left mb-3">
                                        <label>{currentIsCurrency ? 'Precio observado' : 'Valor observado'}</label>
                                        <div className="card elev-sm items-center justify-center py-4 px-3" style={{ minHeight: 56 }}>
                                            <span
                                                className="text-3xl font-medium"
                                                style={{
                                                    letterSpacing: '-0.01em',
                                                    color: hasValidValue(localValues[currentVariable.id]) ? 'var(--color-ink)' : 'var(--color-nc-neutral-500)',
                                                }}
                                            >
                                                {currentIsCurrency ? '₲ ' : ''}{numericDisplayText}
                                            </span>
                                        </div>
                                    </div>
                                    <Keypad
                                        value={numericRawValue}
                                        onChange={(v) => handleValueChange(currentVariable, v)}
                                        allowDecimal={!currentIsCurrency}
                                        disabled={isUnavailable}
                                    />
                                </div>
                            )}

                            {currentVariable.dataType === 'categorical' && (
                                <div className="flex flex-wrap justify-center gap-2.5 mb-5">
                                    {((currentVariable.config as CategoricalVariableConfig | null)?.options ?? []).map(option => {
                                        const isSelected = localValues[currentVariable.id] === option;
                                        return (
                                            <button
                                                key={option}
                                                onClick={() => handleCategoricalSelect(currentVariable, option)}
                                                disabled={isUnavailable}
                                                className={`tag ${isSelected ? 'tag-accent' : 'tag-outline'}`}
                                                style={{ fontSize: 14, padding: '9px 16px' }}
                                            >
                                                {option}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {currentVariable.dataType === 'boolean' && (
                                <div className="flex justify-center gap-3 mb-5">
                                    <button
                                        onClick={() => handleBooleanSelect(currentVariable, true)}
                                        disabled={isUnavailable}
                                        className={`tag ${localValues[currentVariable.id] === true ? 'tag-accent' : 'tag-outline'}`}
                                        style={{ fontSize: 16, padding: '10px 26px' }}
                                    >
                                        Sí
                                    </button>
                                    <button
                                        onClick={() => handleBooleanSelect(currentVariable, false)}
                                        disabled={isUnavailable}
                                        className={`tag ${localValues[currentVariable.id] === false ? 'tag-accent' : 'tag-outline'}`}
                                        style={{ fontSize: 16, padding: '10px 26px' }}
                                    >
                                        No
                                    </button>
                                </div>
                            )}

                            {currentVariable.dataType === 'text' && (
                                <div className="mb-5">
                                    <textarea
                                        ref={textInputRef}
                                        value={typeof localValues[currentVariable.id] === 'string' ? localValues[currentVariable.id] as string : ''}
                                        onChange={(e) => handleValueChange(currentVariable, e.target.value)}
                                        disabled={isUnavailable}
                                        rows={4}
                                        className="input text-left"
                                        placeholder="Escribe tu respuesta..."
                                    />
                                </div>
                            )}

                            <label className="radio justify-center text-xs text-muted mb-1">
                                <input
                                    type="checkbox"
                                    checked={isUnavailable}
                                    onChange={(e) => handleToggleUnavailable(e.target.checked)}
                                />
                                <span className="dot" style={{ borderRadius: 4 }} />
                                Marcar como no disponible
                            </label>

                            {!currentValueValidation.valid && (
                                <p className="text-sm font-semibold animate-fade-in mt-2" style={{ color: '#f87171' }}>{currentValueValidation.message}</p>
                            )}
                            {currentValueValidation.valid && hasValidValue(localValues[currentVariable.id]) && !isUnavailable && (
                                <p className="text-success text-sm font-semibold animate-fade-in mt-2">✓ Valor registrado</p>
                            )}
                        </div>
                    </main>

                    <footer className="flex-none px-4 py-4 border-t" style={{ borderColor: 'var(--color-divider)' }}>
                        <div className="w-full max-w-sm mx-auto flex flex-col gap-3">
                            <div className="flex justify-between items-center text-xs text-muted">
                                <span>{step + 1} de {sortedVariables.length}</span>
                                <span>{Math.round((step / sortedVariables.length) * 100)}%</span>
                            </div>
                            <div className="relative h-[5px] rounded-full overflow-visible" style={{ background: 'var(--color-nc-neutral-800)' }}>
                                {studyFieldBreakpoints.map((breakpoint, index) => (
                                    <div
                                        key={index}
                                        className="absolute top-0 bottom-0 w-px"
                                        style={{ left: `${breakpoint.position}%`, background: 'var(--color-divider)' }}
                                        title={breakpoint.fieldName}
                                    >
                                        <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-nc-neutral-500)' }}></div>
                                    </div>
                                ))}
                                <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{ background: 'var(--color-accent)', width: `${(step / sortedVariables.length) * 100}%` }}
                                ></div>
                            </div>
                            <div className="flex gap-2.5">
                                <button onClick={handlePrev} disabled={step === 0} className="btn btn-secondary flex-1">
                                    <ChevronLeft size={16} /> Anterior
                                </button>
                                <button onClick={() => setPhase('summary')} className="btn btn-icon btn-secondary" title="Ver resumen">
                                    <List size={16} />
                                </button>
                                <button onClick={handleNext} className="btn btn-primary flex-1">
                                    {nextLabel} <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </footer>
                </>
            )}

            {phase === 'summary' && (
                <>
                    <header className="flex-none px-4 py-4 flex items-center gap-2.5 border-b" style={{ borderColor: 'var(--color-divider)' }}>
                        <button onClick={() => setPhase('form')} className="btn btn-icon btn-secondary rounded-full" aria-label="Volver">
                            <ArrowLeft size={16} />
                        </button>
                        <div className="text-base font-medium text-ink flex-1 truncate">Resumen — {observationUnit.name}</div>
                        <button onClick={() => onClose(localValues)} className="btn btn-icon btn-secondary rounded-full" aria-label="Cerrar">
                            <X size={16} />
                        </button>
                    </header>

                    <main key="summary" className="flex-1 overflow-y-auto overflow-x-hidden p-4 slide-item-enter">
                        {selectedStudyFieldId ? (
                            <StudyFieldView
                                studyField={studyFieldsMap[selectedStudyFieldId]}
                                variables={sortedVariables}
                                values={localValues}
                                onEdit={(index) => {
                                    setSelectedStudyFieldId(null);
                                    setStep(index);
                                    setPhase('form');
                                }}
                                onBack={handleBackToSummary}
                            />
                        ) : (
                            <RegistrationSummary
                                variables={sortedVariables}
                                studyFields={studyFields}
                                values={localValues}
                                onEdit={(index) => { setStep(index); setPhase('form'); }}
                                onStudyFieldClick={handleStudyFieldClick}
                            />
                        )}
                    </main>

                    <footer className="flex-none px-4 py-4 border-t" style={{ borderColor: 'var(--color-divider)' }}>
                        <button onClick={confirmSubmission} className="btn btn-primary btn-block">
                            <Send size={16} /> Confirmar y enviar
                        </button>
                    </footer>
                </>
            )}

            {phase === 'confirmed' && (
                <div key="confirmed" className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center slide-item-enter">
                    <div
                        className="flex items-center justify-center h-16 w-16 rounded-full"
                        style={{ border: '1.5px solid var(--color-success)', color: 'var(--color-success)' }}
                    >
                        <CheckCircle2 size={30} />
                    </div>
                    <div>
                        <h3 className="text-xl font-medium text-ink mb-1.5">Registro enviado</h3>
                        <p className="text-sm text-muted">Los valores de {observationUnit.name} fueron registrados correctamente.</p>
                    </div>
                    <button onClick={() => onSubmitSuccess(observationUnit.id)} className="btn btn-primary btn-block max-w-xs">
                        Volver al panel
                    </button>
                </div>
            )}

            {isSubmitting && <LoadingOverlay message="Enviando registro..." />}
        </div>
    );
}
