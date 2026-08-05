import { useMemo, type ReactNode } from 'react';
import {
    Bar,
    BarChart,
    LabelList,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    AXIS_TICK,
    CHART_COLORS,
    ORDINAL_RAMP,
    ORDINAL_RAMP_INK,
    formatShare,
} from './chartTheme';
import { ChartTooltipBox } from './ChartTooltipBox';

export interface ShareCategory {
    key: string;
    label: string;
}

export interface ShareRow {
    period: string;
    /** Respuestas del período. Sin esto, un 50% de 2 respuestas se lee igual que uno de 200. */
    total: number;
    shares: Record<string, number>;
    counts: Record<string, number>;
}

export interface SharesStackedChartProps {
    categories: ShareCategory[];
    rows: ShareRow[];
    rowHeight?: number;
}

const AXIS_BAND = 28;
/** Debajo de esto la etiqueta no entra en el segmento y se recorta. */
const MIN_LABEL_SHARE = 0.12;

interface ChartRow {
    period: string;
    [key: `c${number}`]: number | string;
}

interface TooltipPayloadItem {
    payload?: ChartRow & { __row: ShareRow };
}

/*
 * Composición por período: una barra al 100% por período, un segmento por
 * categoría. Responde "cómo se repartieron las respuestas y cómo se movió ese
 * reparto", que es lo único agregable de una variable cualitativa.
 *
 * Rampa ordinal de un solo tono (ver chartTheme): las categorías de estas
 * variables suelen tener orden propio -- mucho/poco/nada, alto/medio/bajo --
 * y una rampa lo muestra en el color. Cinco pasos como techo; el resto se
 * pliega en "Otros" antes de llegar acá.
 *
 * Los segmentos se separan con un filete del color de la superficie: es el
 * hueco de 2px, no un borde de contraste que agregaría una línea más al dibujo.
 */
export const SharesStackedChart = ({
    categories,
    rows,
    rowHeight = 38,
}: SharesStackedChartProps) => {
    const data = useMemo<(ChartRow & { __row: ShareRow })[]>(
        () =>
            rows.map(row => {
                const point = { period: row.period, __row: row } as ChartRow & { __row: ShareRow };
                categories.forEach((category, index) => {
                    point[`c${index}`] = row.shares[category.key] ?? 0;
                });
                return point;
            }),
        [rows, categories],
    );

    return (
        <div>
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
                {categories.map((category, index) => (
                    <li key={category.key} className="flex items-center gap-1.5 text-xs text-muted">
                        <span
                            className="inline-block size-2.5 rounded-[2px]"
                            style={{ background: ORDINAL_RAMP[index] }}
                            aria-hidden="true"
                        />
                        {category.label}
                    </li>
                ))}
            </ul>

            <div style={{ width: '100%', height: rows.length * rowHeight + AXIS_BAND + 8 }}>
                <ResponsiveContainer>
                    <BarChart
                        layout="vertical"
                        data={data}
                        margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
                        barCategoryGap="22%"
                    >
                        <XAxis
                            type="number"
                            domain={[0, 1]}
                            tick={AXIS_TICK}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatShare}
                        />
                        <YAxis
                            type="category"
                            dataKey="period"
                            width={140}
                            tick={AXIS_TICK}
                            tickLine={false}
                            axisLine={false}
                        />
                        <RechartsTooltip
                            cursor={{ fill: 'var(--color-accent-900)', fillOpacity: 0.5 }}
                            content={({ active, payload }) => {
                                const row = (payload as TooltipPayloadItem[] | undefined)?.[0]?.payload?.__row;
                                if (!active || !row) return null;
                                return (
                                    <ChartTooltipBox
                                        title={row.period}
                                        rows={categories.map((category, index) => ({
                                            label: category.label,
                                            value: `${row.counts[category.key] ?? 0} · ${formatShare(row.shares[category.key] ?? 0)}`,
                                            swatch: ORDINAL_RAMP[index],
                                        }))}
                                        footnote={`${row.total} respuesta(s)`}
                                    />
                                );
                            }}
                        />
                        {categories.map((category, index) => (
                            <Bar
                                key={category.key}
                                dataKey={`c${index}`}
                                name={category.label}
                                stackId="shares"
                                fill={ORDINAL_RAMP[index]}
                                stroke={CHART_COLORS.surface}
                                strokeWidth={2}
                                isAnimationActive={false}
                            >
                                <LabelList
                                    dataKey={`c${index}`}
                                    position="center"
                                    fontSize={11}
                                    fill={ORDINAL_RAMP_INK[index]}
                                    // Debajo del umbral la etiqueta no entra en el
                                    // segmento: mejor sin número que con un número
                                    // recortado. El valor sigue en el tooltip y en
                                    // la tabla de la card.
                                    formatter={(share: ReactNode) =>
                                        typeof share === 'number' && share >= MIN_LABEL_SHARE
                                            ? formatShare(share)
                                            : ''
                                    }
                                />
                            </Bar>
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
