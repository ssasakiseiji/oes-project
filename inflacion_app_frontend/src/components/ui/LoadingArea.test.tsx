import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LoadingArea } from './LoadingArea';
import {
    LOADING_DELAY_MS,
    LOADING_FADE_MS,
    LOADING_MIN_VISIBLE_MS,
} from '../../hooks/useDelayedLoading';

const SKELETON = <div data-testid="skeleton" />;
const CONTENT = <div data-testid="content" />;

const renderArea = (isLoading: boolean) =>
    render(
        <LoadingArea isLoading={isLoading} skeleton={SKELETON}>
            {CONTENT}
        </LoadingArea>
    );

// El envoltorio con la opacidad, que es lo que decide si el placeholder se ve
// o sólo reserva su alto.
const skeletonLayer = () => screen.getByTestId('skeleton').parentElement;

describe('LoadingArea', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('monta el skeleton desde el primer render, invisible, durante la ventana de gracia', () => {
        renderArea(true);

        // Montado (reserva su alto) pero sin mostrarse: es lo que evita que el
        // contenedor se dibuje "acortado" y después pegue el salto.
        expect(screen.getByTestId('skeleton')).toBeInTheDocument();
        expect(skeletonLayer()).toHaveStyle({ opacity: '0' });
        expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });

    it('muestra el skeleton cuando la carga supera la ventana de gracia', () => {
        renderArea(true);

        act(() => { vi.advanceTimersByTime(LOADING_DELAY_MS); });

        expect(skeletonLayer()).toHaveStyle({ opacity: '1' });
        expect(skeletonLayer()).toHaveStyle({ transition: `opacity ${LOADING_FADE_MS}ms ease` });
    });

    it('no llega a mostrar el skeleton si la carga termina dentro de la ventana de gracia', () => {
        const { rerender } = renderArea(true);

        act(() => { vi.advanceTimersByTime(LOADING_DELAY_MS - 150); });
        rerender(
            <LoadingArea isLoading={false} skeleton={SKELETON}>
                {CONTENT}
            </LoadingArea>
        );

        expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
        expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('sostiene el skeleton el mínimo en pantalla aunque los datos ya hayan llegado', () => {
        const { rerender } = renderArea(true);

        act(() => { vi.advanceTimersByTime(LOADING_DELAY_MS); });   // el skeleton se hizo visible
        rerender(
            <LoadingArea isLoading={false} skeleton={SKELETON}>
                {CONTENT}
            </LoadingArea>
        );

        // Todavía no pasó el mínimo: sale el placeholder, no el contenido.
        expect(screen.getByTestId('skeleton')).toBeInTheDocument();
        expect(screen.queryByTestId('content')).not.toBeInTheDocument();

        // El fundido de entrada no cuenta como tiempo visible: a los 500ms de
        // haberse montado todavía no se cumplió la ventana plena.
        act(() => { vi.advanceTimersByTime(LOADING_MIN_VISIBLE_MS); });
        expect(screen.getByTestId('skeleton')).toBeInTheDocument();

        act(() => { vi.advanceTimersByTime(LOADING_FADE_MS); });

        expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
        expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('anima el alto en vez de saltar', () => {
        const { container } = renderArea(true);

        expect(container.firstChild).toHaveStyle({ transition: 'height 280ms ease' });
    });
});
