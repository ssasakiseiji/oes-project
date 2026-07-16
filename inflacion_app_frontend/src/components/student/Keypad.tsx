import { Delete } from 'lucide-react';

interface KeypadProps {
    value: string;
    onChange: (nextValue: string) => void;
    allowDecimal?: boolean;
    maxDigits?: number;
    disabled?: boolean;
}

// Teclado numérico propio (no usa el teclado nativo del SO) -- controlado,
// sin lógica de formato/moneda: eso lo sigue manejando el llamador
// (handleValueChange en RegistrationWizard), igual que antes con el <input>.
export default function Keypad({ value, onChange, allowDecimal = false, maxDigits, disabled = false }: KeypadProps) {
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

    const keyClass = 'btn btn-secondary h-[52px] text-[19px]';

    return (
        <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <button key={digit} type="button" disabled={disabled} onClick={() => pressDigit(digit)} className={keyClass}>
                    {digit}
                </button>
            ))}
            {/* La grilla del mockup es 3x4 fija (sin espacio para una 13a tecla) --
                el slot "C" se reemplaza por "." cuando la variable admite decimales. */}
            <button type="button" disabled={disabled} onClick={allowDecimal ? pressDecimal : pressClear} className={keyClass}>
                {allowDecimal ? '.' : 'C'}
            </button>
            <button type="button" disabled={disabled} onClick={() => pressDigit('0')} className={keyClass}>
                0
            </button>
            <button type="button" disabled={disabled} onClick={pressBackspace} className={keyClass} aria-label="Borrar">
                <Delete size={20} />
            </button>
        </div>
    );
}
