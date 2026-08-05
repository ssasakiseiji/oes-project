import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Keypad from './Keypad';

// El Keypad es controlado, así que para probar el teclado físico hace falta
// alguien que sostenga el valor (en la app real es RegistrationWizard).
function ControlledKeypad({ allowDecimal = false, disabled = false, initial = '' }) {
    const [value, setValue] = useState(initial);
    return (
        <>
            <span data-testid="value">{value}</span>
            <Keypad value={value} onChange={setValue} allowDecimal={allowDecimal} disabled={disabled} />
        </>
    );
}

const currentValue = () => screen.getByTestId('value').textContent;

describe('Keypad — teclado físico', () => {
    it('los dígitos del teclado escriben en el valor', () => {
        render(<ControlledKeypad />);

        fireEvent.keyDown(window, { key: '1' });
        fireEvent.keyDown(window, { key: '2' });
        fireEvent.keyDown(window, { key: '5' });
        fireEvent.keyDown(window, { key: '0' });

        expect(currentValue()).toBe('1250');
    });

    it('Backspace borra el último dígito', () => {
        render(<ControlledKeypad initial="1250" />);

        fireEvent.keyDown(window, { key: 'Backspace' });

        expect(currentValue()).toBe('125');
    });

    it('marca visualmente la tecla accionada desde el teclado', () => {
        render(<ControlledKeypad />);
        const sevenKey = screen.getByRole('button', { name: '7' });

        expect(sevenKey).not.toHaveStyle({ background: 'color-mix(in srgb, var(--color-ink) 14%, transparent)' });
        fireEvent.keyDown(window, { key: '7' });
        expect(sevenKey).toHaveStyle({ background: 'color-mix(in srgb, var(--color-ink) 14%, transparent)' });
    });

    it('con decimales habilitados, el punto y la coma escriben el separador', () => {
        render(<ControlledKeypad allowDecimal initial="3" />);

        fireEvent.keyDown(window, { key: ',' }); // lo que emite el numpad en layouts es-*
        fireEvent.keyDown(window, { key: '5' });

        expect(currentValue()).toBe('3.5');
    });

    it('sin decimales, el punto no hace nada y Delete/C limpian el valor', () => {
        render(<ControlledKeypad initial="1250" />);

        fireEvent.keyDown(window, { key: '.' });
        expect(currentValue()).toBe('1250');

        fireEvent.keyDown(window, { key: 'Delete' });
        expect(currentValue()).toBe('');
    });

    it('ignora el teclado mientras el foco está en un campo de texto', () => {
        render(
            <>
                <input aria-label="buscar" />
                <ControlledKeypad />
            </>
        );

        const input = screen.getByLabelText('buscar');
        input.focus();
        fireEvent.keyDown(input, { key: '9' });

        expect(currentValue()).toBe('');
    });

    it('ignora el teclado si hay un modal abierto encima', () => {
        render(
            <>
                <div role="dialog">Confirmar envío</div>
                <ControlledKeypad />
            </>
        );

        fireEvent.keyDown(window, { key: '9' });

        expect(currentValue()).toBe('');
    });

    it('ignora el teclado cuando la variable está marcada como no disponible', () => {
        render(<ControlledKeypad disabled />);

        fireEvent.keyDown(window, { key: '9' });

        expect(currentValue()).toBe('');
    });

    it('no secuestra los atajos del navegador', () => {
        render(<ControlledKeypad />);

        fireEvent.keyDown(window, { key: '1', ctrlKey: true });

        expect(currentValue()).toBe('');
    });
});
