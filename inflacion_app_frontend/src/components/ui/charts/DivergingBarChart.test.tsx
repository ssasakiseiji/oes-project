import { cloneElement, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DivergingBarChart } from './DivergingBarChart';

vi.mock('recharts', async () => {
    const actual = await vi.importActual<typeof import('recharts')>('recharts');
    return {
        ...actual,
        ResponsiveContainer: ({ children }: { children: ReactElement }) => (
            <div>{cloneElement(children, { width: 800, height: 200 } as never)}</div>
        ),
    };
});

const fmt = (value: number) => `${value.toFixed(2)}%`;

describe('DivergingBarChart', () => {
    it('dibuja una barra por fila, con su valor escrito en la punta', () => {
        const { container } = render(
            <DivergingBarChart
                rows={[
                    { key: 'a', label: 'Sube', value: 10 },
                    { key: 'b', label: 'Baja', value: -30 },
                ]}
                formatValue={fmt}
            />,
        );

        expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2);
        const labels = [...container.querySelectorAll('.recharts-label-list text')].map(t => t.textContent);
        expect(labels).toContain('10.00%');
        expect(labels).toContain('-30.00%');
    });

    // El caso que rompía en pantalla: una sola fila y variación 0. Con las dos
    // series apiladas de antes (una por signo, con un null por fila) recharts no
    // emitía ni el rect ni la escala, y la card quedaba vacía sin decir por qué.
    it('sigue dibujando la marca con una sola fila en cero', () => {
        const { container } = render(
            <DivergingBarChart rows={[{ key: 'a', label: 'Alimentos', value: 0 }]} formatValue={fmt} />,
        );

        expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(1);
        const labels = [...container.querySelectorAll('.recharts-label-list text')].map(t => t.textContent);
        expect(labels).toContain('0.00%');
    });
});
