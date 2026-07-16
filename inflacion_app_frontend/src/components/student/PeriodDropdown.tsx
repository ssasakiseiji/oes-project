import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface PeriodOption {
    value: number;
    label: string;
    status: string;
}

interface StatusDotConfig {
    color: string;
    label: string;
}

// Period.status en el backend real tiene 3 valores (Open/Closed/Scheduled);
// el mockup solo diseñó 2 puntos de color (Activo/Cerrado) -- Scheduled usa
// --color-accent-2 como tercer color, judgment call no cubierto por el diseño.
const STATUS_DOTS: Record<string, StatusDotConfig> = {
    Open: { color: 'var(--color-success)', label: 'Activo' },
    Closed: { color: 'var(--color-nc-neutral-500)', label: 'Cerrado' },
    Scheduled: { color: 'var(--color-accent-2)', label: 'Programado' },
};

interface PeriodDropdownProps {
    options: PeriodOption[];
    value: PeriodOption | null;
    onChange: (option: PeriodOption) => void;
}

export default function PeriodDropdown({ options, value, onChange }: PeriodDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const currentDot = value ? (STATUS_DOTS[value.status] ?? STATUS_DOTS.Closed) : STATUS_DOTS.Closed;

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                className="input flex w-full cursor-pointer items-center justify-between"
                aria-expanded={isOpen}
            >
                <span className="flex min-w-0 items-center gap-2">
                    <span
                        className="h-[7px] w-[7px] flex-shrink-0 rounded-full"
                        style={{
                            background: currentDot.color,
                            boxShadow: `0 0 0 4px color-mix(in srgb, ${currentDot.color} 18%, transparent)`,
                        }}
                    />
                    <span className="truncate">{value?.label ?? 'Seleccionar período'}</span>
                </span>
                <ChevronDown
                    size={14}
                    className={`flex-shrink-0 opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="card elev-md absolute left-0 right-0 top-[calc(100%+6px)] z-10 gap-0.5 p-1.5">
                    {options.map(option => {
                        const optionDot = STATUS_DOTS[option.status] ?? STATUS_DOTS.Closed;
                        const isActive = value?.value === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option);
                                    setIsOpen(false);
                                }}
                                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors ${
                                    isActive ? 'bg-accent/15 text-ink font-semibold' : 'text-ink/85 hover:bg-nc-neutral-500/10'
                                }`}
                            >
                                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: optionDot.color }} />
                                <span className="flex-1 truncate">{option.label}</span>
                                <span className="text-muted flex-shrink-0 text-[11px]">{optionDot.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
