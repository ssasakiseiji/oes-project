import { cloneElement, type ReactElement } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalysisChartsView } from './AnalysisChartsView';
import type { AnalysisHistory, AnalysisResult } from '../../types/api';

// Smoke + reglas de cálculo de la pestaña de gráficos (Fase AE). Lo que se
// verifica acá es lo que ningún typecheck agarra: que los bloques monten con
// datos reales, y sobre todo que la INCIDENCIA sume la variación del total --
// si esa identidad se rompe, el gráfico dice que las partes no hacen al todo.

vi.mock('../../api', () => ({
    apiFetch: vi.fn(() => Promise.resolve([])),
}));

// recharts mide su contenedor con ResizeObserver y en jsdom mide 0: sin esto
// ResponsiveContainer no renderiza nunca y el test no probaría nada. Se le
// inyecta el tamaño al gráfico directamente en vez de envolverlo otra vez.
vi.mock('recharts', async () => {
    const actual = await vi.importActual<typeof import('recharts')>('recharts');
    return {
        ...actual,
        ResponsiveContainer: ({ children }: { children: ReactElement }) => (
            <div>{cloneElement(children, { width: 800, height: 300 } as never)}</div>
        ),
    };
});

const report: AnalysisResult = {
    studyFieldAnalysis: [
        {
            id: 1,
            name: 'Alimentos',
            unitOfMeasure: '₲',
            quantitative: [
                { id: 10, name: 'Pan', unit: 'kg', isCurrency: true, valueA: 11000, valueB: 10000, variation: 10, sampleA: 3, sampleB: 3 },
                { id: 11, name: 'Aceite', unit: 'litro', isCurrency: true, valueA: 14000, valueB: 20000, variation: -30, sampleA: 2, sampleB: 2 },
                // Sin dato en la base: queda fuera del set comparable.
                { id: 12, name: 'Arroz', unit: 'kg', isCurrency: true, valueA: 9000, valueB: null, variation: null, sampleA: 1, sampleB: 0 },
            ],
            qualitative: [
                {
                    id: 20,
                    name: '¿Había faltantes?',
                    dataType: 'boolean',
                    distributionA: [{ value: 'true', count: 2, share: 0.5 }, { value: 'false', count: 2, share: 0.5 }],
                    distributionB: [{ value: 'true', count: 1, share: 0.25 }, { value: 'false', count: 3, share: 0.75 }],
                    responsesA: 4,
                    responsesB: 4,
                },
            ],
            aggregate: { method: 'sum', isCurrency: true, valueA: 25000, valueB: 30000, variation: -16.666666666666664, comparableVariables: 2, excludedVariables: 1 },
        },
    ],
    unitTotals: [
        {
            unitOfMeasure: '₲',
            method: 'sum',
            isCurrency: true,
            valueA: 25000,
            valueB: 30000,
            variation: -16.666666666666664,
            studyFieldIds: [1],
        },
    ],
    unitlessNumericStudyFields: [],
};

const history: AnalysisHistory = {
    periods: [
        { id: 1, name: 'Mayo 2026' },
        { id: 2, name: 'Junio 2026' },
        { id: 3, name: 'Julio 2026' },
    ],
    units: [
        {
            unitOfMeasure: '₲',
            method: 'sum',
            isCurrency: true,
            values: [28000, null, 25000],
            seriesVariables: 2,
            totalVariables: 3,
        },
    ],
    studyFields: [
        {
            id: 1,
            name: 'Alimentos',
            unitOfMeasure: '₲',
            method: 'sum',
            isCurrency: true,
            values: [28000, null, 25000],
            seriesVariables: 2,
            totalVariables: 3,
        },
    ],
};

const renderView = () =>
    render(
        <AnalysisChartsView
            projectId={1}
            report={report}
            history={history}
            isLoading={false}
            periodALabel="Julio 2026"
            periodBLabel="Mayo 2026"
        />,
    );

describe('AnalysisChartsView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('monta los bloques de evolución, comparación y cualitativas', async () => {
        renderView();

        expect(await screen.findByText('Canasta en ₲')).toBeInTheDocument();
        expect(screen.getByText('Evolución por campo de estudio')).toBeInTheDocument();
        expect(screen.getByText('Variación por campo de estudio')).toBeInTheDocument();
        expect(screen.getByText('Variables que más se movieron')).toBeInTheDocument();
        expect(screen.getByText('Incidencia en canasta de ₲')).toBeInTheDocument();
        expect(screen.getByText('Distribución por período')).toBeInTheDocument();
    });

    it('avisa que la serie corre sobre el set comparable y no sobre todas las variables', async () => {
        renderView();
        expect(await screen.findByText(/Serie sobre 2 de 3 variables/)).toBeInTheDocument();
    });

    it('las incidencias suman exactamente la variación del total', async () => {
        const user = userEvent.setup();
        renderView();

        // La tabla de la card de incidencia trae una fila por variable comparable.
        const card = screen.getByText('Incidencia en canasta de ₲').closest('section') as HTMLElement;
        await user.click(within(card).getByRole('button', { name: 'Ver tabla' }));

        // Pan: (11000-10000)/30000 = +3,33 pp · Aceite: (14000-20000)/30000 = -20,00 pp
        // Suma: -16,67 pp == variación de la canasta.
        expect(within(card).getByText('+3.33%')).toBeInTheDocument();
        expect(within(card).getByText('-20.00%')).toBeInTheDocument();

        const totalVariation = report.unitTotals[0].variation!;
        const incidences = [
            ((11000 - 10000) / 30000) * 100,
            ((14000 - 20000) / 30000) * 100,
        ];
        expect(incidences.reduce((a, b) => a + b, 0)).toBeCloseTo(totalVariation, 10);
    });

    it('deja fuera del agregado la variable sin dato en ambos períodos', async () => {
        renderView();
        // Arroz solo tiene valor actual: no puede pesar en la incidencia.
        expect(
            await screen.findByText(/Sobre las 2 variable\(s\) con dato en ambos períodos/),
        ).toBeInTheDocument();
    });
});
