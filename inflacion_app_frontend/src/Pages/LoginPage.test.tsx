import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './LoginPage';

// El bug que cubren estos tests: tras vencer el token la app volvía al login
// recargando el documento, el navegador reautocompletaba email/contraseña
// escribiendo directo en el DOM sin disparar onChange, y con inputs
// controlados React pisaba esos valores con el string vacío del estado. El
// submit mandaba "" y "", y el backend contesta eso con "Credenciales
// incorrectas" -- el error que no cerraba con lo que se veía en pantalla.
//
// `autofill` reproduce exactamente eso: setea .value con el setter nativo del
// prototipo (que es lo que hace el navegador) SIN emitir ningún evento de
// React.
const autofill = (input: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
    )!.set!;
    setter.call(input, value);
};

const emailInput = () => screen.getByLabelText('Correo electrónico') as HTMLInputElement;
const passwordInput = () => screen.getByLabelText('Contraseña') as HTMLInputElement;
const submit = () => fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

const lastRequestBody = (fetchMock: ReturnType<typeof vi.fn>) =>
    JSON.parse((fetchMock.mock.calls.at(-1)?.[1] as RequestInit).body as string);

describe('LoginPage — credenciales autocompletadas', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('manda lo que el navegador autocompletó, aunque no haya pasado por onChange', async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({ token: 't', user: { id: 1, name: 'Admin', roles: [] } }),
        });
        const onLoginSuccess = vi.fn();
        render(<LoginPage onLoginSuccess={onLoginSuccess} />);

        autofill(emailInput(), 'admin@portalipc.com');
        autofill(passwordInput(), 'una-contrasena');
        submit();

        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        expect(lastRequestBody(fetchMock)).toEqual({
            email: 'admin@portalipc.com',
            password: 'una-contrasena',
        });
        await waitFor(() => expect(onLoginSuccess).toHaveBeenCalled());
    });

    it('un re-render posterior no borra lo autocompletado', async () => {
        // Con inputs controlados este era el modo de falla visible: el error de
        // un intento fallido re-renderiza y el value vuelve al estado vacío.
        fetchMock.mockResolvedValue({
            ok: false,
            json: async () => ({ message: 'Credenciales incorrectas' }),
        });
        render(<LoginPage onLoginSuccess={vi.fn()} />);

        autofill(emailInput(), 'admin@portalipc.com');
        autofill(passwordInput(), 'una-contrasena');
        submit();

        await screen.findByRole('alert');
        expect(emailInput().value).toBe('admin@portalipc.com');
        expect(passwordInput().value).toBe('una-contrasena');
    });

    it('lo tipeado a mano sigue llegando igual', async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({ token: 't', user: { id: 1, name: 'Admin', roles: [] } }),
        });
        render(<LoginPage onLoginSuccess={vi.fn()} />);

        fireEvent.change(emailInput(), { target: { value: 'juan@portalipc.com' } });
        fireEvent.change(passwordInput(), { target: { value: 'tecleada' } });
        submit();

        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        expect(lastRequestBody(fetchMock)).toEqual({
            email: 'juan@portalipc.com',
            password: 'tecleada',
        });
    });
});
