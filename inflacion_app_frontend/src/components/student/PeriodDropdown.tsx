import { ChevronDown, Check } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
} from '../ui/dropdown-menu';

export interface PeriodOption {
    value: number;
    label: string;
    status: string;
}

// Period.status en el backend real tiene 3 valores (Open/Closed/Scheduled).
// El estado ya no se señala con un punto de color sino con la palabra en el
// subtítulo del botón, y esa palabra va en el gris de texto secundario, no en
// un color de acento: el estado lo dice el texto, no un semáforo.
const STATUS_LABELS: Record<string, string> = {
    Open: 'Activo',
    Closed: 'Vencido',
    Scheduled: 'Programado',
};

interface PeriodDropdownProps {
    options: PeriodOption[];
    value: PeriodOption | null;
    onChange: (option: PeriodOption) => void;
    // El panel de monitor lo usa dentro de un .field alineado a la izquierda;
    // en el de estudiante vive arriba a la derecha, junto al título.
    align?: 'start' | 'end';
}

export default function PeriodDropdown({ options, value, onChange, align = 'end' }: PeriodDropdownProps) {
    const currentLabel = value ? (STATUS_LABELS[value.status] ?? STATUS_LABELS.Closed) : null;

    return (
        <div className={`flex flex-col ${align === 'end' ? 'items-end' : 'items-start'}`}>
            {/* modal={false} a propósito: en modo modal Radix aplica aria-hidden
                a todo #root mientras el menú está abierto, y al cerrar devuelve
                el foco al trigger antes de sacar ese aria-hidden (el cleanup del
                FocusScope hijo corre antes que el del padre). Chrome bloquea eso
                y avisa por consola. Este menú no necesita trampa de foco ni
                bloqueo de scroll, así que el modo no-modal lo evita de raíz. */}
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="group/trigger btn btn-secondary rounded-full max-w-[14rem] px-3 py-1.5"
                    >
                        <span className="truncate">{value?.label ?? 'Seleccionar período'}</span>
                        <ChevronDown
                            size={14}
                            className="flex-shrink-0 opacity-70 transition-transform duration-200 group-data-[state=open]/trigger:rotate-180"
                        />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={align} className="w-56">
                    <DropdownMenuLabel className="text-muted">Cambiar período</DropdownMenuLabel>
                    {options.map(option => {
                        const isActive = value?.value === option.value;
                        return (
                            <DropdownMenuItem
                                key={option.value}
                                onSelect={() => onChange(option)}
                                className={`py-2.5 px-2.5 ${isActive ? 'text-ink font-semibold' : 'text-ink/80'}`}
                            >
                                <span className="flex-1 truncate">{option.label}</span>
                                <span className="text-muted flex-shrink-0 text-[11px]">
                                    {STATUS_LABELS[option.status] ?? STATUS_LABELS.Closed}
                                </span>
                                {isActive && <Check size={16} className="text-accent" />}
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>

            {currentLabel && (
                <span className="text-muted mt-1 px-1 text-[11px] uppercase tracking-wide">
                    {currentLabel}
                </span>
            )}
        </div>
    );
}
