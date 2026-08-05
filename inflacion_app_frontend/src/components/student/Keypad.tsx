import { useEffect, useRef, useState } from 'react';
import { Delete } from 'lucide-react';

interface KeypadProps {
    value: string;
    onChange: (nextValue: string) => void;
    allowDecimal?: boolean;
    maxDigits?: number;
    disabled?: boolean;
}

// Cuánto queda "apretada" en pantalla una tecla accionada desde el teclado
// físico (ms). Suficiente para verla sin que se sienta pegajosa al tipear rápido.
const FLASH_MS = 130;

// Teclado numérico propio (no usa el teclado nativo del SO) -- controlado,
// sin lógica de formato/moneda: eso lo sigue manejando el llamador
// (handleValueChange en RegistrationWizard), igual que antes con el <input>.
//
// En desktop el teclado físico (fila numérica o numpad) acciona estas mismas
// teclas. Como no hay ningún <input> donde tipear, el listener va en window y
// la tecla correspondiente de la grilla se ilumina un instante para que se vea
// qué se apretó.
export default function Keypad({ value, onChange, allowDecimal = false, maxDigits, disabled = false }: KeypadProps) {
    const [pressedKey, setPressedKey] = useState<string | null>(null);
    const flashTimeout = useRef<number | null>(null);

    const flash = (key: string) => {
        setPressedKey(key);
        if (flashTimeout.current !== null) window.clearTimeout(flashTimeout.current);
        flashTimeout.current = window.setTimeout(() => setPressedKey(null), FLASH_MS);
    };

    const pressDigit = (digit: string) => {
        if (disabled) return;
        const digitCount = value.replace(/\D/g, '').length;
        if (maxDigits != null && digitCount >= maxDigits) return;
        onChange(value + digit);
    };

    const pressDecimal = () => {
        if (disabled || value.includes('.')) return;
        onChange(value === '' ? '0.' : value + '.');
    };

    const pressBackspace = () => {
        if (disabled) return;
        onChange(value.slice(0, -1));
    };

    const pressClear = () => {
        if (disabled) return;
        onChange('');
    };

    // Ref con el estado del render actual: deja suscribir el listener de window
    // una sola vez sin quedarse con un `value` viejo en la closure.
    const latest = useRef({ disabled, allowDecimal, pressDigit, pressDecimal, pressBackspace, pressClear });
    latest.current = { disabled, allowDecimal, pressDigit, pressDecimal, pressBackspace, pressClear };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const { disabled, allowDecimal, pressDigit, pressDecimal, pressBackspace, pressClear } = latest.current;
            if (disabled) return;
            // No secuestrar atajos del navegador (Ctrl+R, Alt+Tab, etc.).
            if (event.ctrlKey || event.metaKey || event.altKey) return;

            // Si el foco está en un campo de texto (buscador de variables,
            // observación cualitativa) manda ese campo, no el keypad.
            const target = event.target as HTMLElement | null;
            if (target?.isContentEditable) return;
            if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

            // Un modal abierto arriba del wizard (buscador, confirmación de
            // envío) se queda con el teclado aunque el foco no esté en un input.
            if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;

            // event.key es '0'-'9' tanto en la fila numérica como en el numpad.
            if (/^[0-9]$/.test(event.key)) {
                event.preventDefault();
                pressDigit(event.key);
                flash(event.key);
                return;
            }

            if (event.key === 'Backspace') {
                event.preventDefault();
                pressBackspace();
                flash('backspace');
                return;
            }

            // El 12° slot de la grilla es '.' o 'C' según la variable, así que
            // cada tecla física solo dispara si su par está visible en pantalla.
            if (allowDecimal) {
                // La coma es lo que emite el numpad en los layouts en español.
                if (event.key === '.' || event.key === ',') {
                    event.preventDefault();
                    pressDecimal();
                    flash('slot12');
                }
                return;
            }

            if (event.key === 'Delete' || event.key === 'c' || event.key === 'C') {
                event.preventDefault();
                pressClear();
                flash('slot12');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => () => {
        if (flashTimeout.current !== null) window.clearTimeout(flashTimeout.current);
    }, []);

    const keyClass = 'btn btn-secondary h-[52px] text-[19px]';
    // Mismo fondo que `.btn-secondary:active` en nocturne.css, para que accionar
    // por teclado se vea igual que un click.
    const pressedStyle = { background: 'color-mix(in srgb, var(--color-ink) 14%, transparent)' };
    const styleFor = (key: string) => (pressedKey === key ? pressedStyle : undefined);

    return (
        <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <button key={digit} type="button" disabled={disabled} onClick={() => pressDigit(digit)} className={keyClass} style={styleFor(digit)}>
                    {digit}
                </button>
            ))}
            {/* La grilla del mockup es 3x4 fija (sin espacio para una 13a tecla) --
                el slot "C" se reemplaza por "." cuando la variable admite decimales. */}
            <button type="button" disabled={disabled} onClick={allowDecimal ? pressDecimal : pressClear} className={keyClass} style={styleFor('slot12')}>
                {allowDecimal ? '.' : 'C'}
            </button>
            <button type="button" disabled={disabled} onClick={() => pressDigit('0')} className={keyClass} style={styleFor('0')}>
                0
            </button>
            <button type="button" disabled={disabled} onClick={pressBackspace} className={keyClass} style={styleFor('backspace')} aria-label="Borrar">
                <Delete size={20} />
            </button>
        </div>
    );
}
