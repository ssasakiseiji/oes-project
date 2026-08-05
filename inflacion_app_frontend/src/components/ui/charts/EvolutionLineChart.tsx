import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { AXIS_LINE, AXIS_TICK, CHART_COLORS, formatCompact } from './chartTheme';
import { ChartTooltipBox } from './ChartTooltipBox';

export interface EvolutionPoint {
    period: string;
    value: number | null;
}

export interface EvolutionLineChartProps {
    data: EvolutionPoint[];
    /** Formato completo (moneda o número + unidad) para tooltip y eje. */
    formatValue: (value: number) => string;
    /** Nombre de lo que se está midiendo, para el tooltip. */
    seriesLabel: string;
    height?: number;
}

interface TooltipPayloadItem {
    payload?: EvolutionPoint;
}

/*
 * Serie única a lo largo de los períodos cerrados. Un solo tono (el acento):
 * no hay identidades que distinguir, así que repartir hues solo restaría
 * atención a la forma de la línea, que es todo el dato.
 *
 * Los null cortan la línea (connectNulls={false}) en vez de puentearla: un
 * período sin datos no es un valor intermedio, y unir los extremos dibujaría
 * una tendencia que nadie midió.
 */
export const EvolutionLineChart = ({
    data,
    formatValue,
    seriesLabel,
    height = 240,
}: EvolutionLineChartProps) => (
    <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                {/* Solo horizontales y sólida: la vertical dobla el ruido sin
                    ayudar a leer un valor, y el punteado se lee como umbral. */}
                <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis
                    dataKey="period"
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={AXIS_LINE}
                    interval="preserveStartEnd"
                    minTickGap={16}
                />
                <YAxis
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tickFormatter={formatCompact}
                />
                <RechartsTooltip
                    cursor={{ stroke: CHART_COLORS.baseline, strokeWidth: 1 }}
                    content={({ active, payload }) => {
                        const point = (payload as TooltipPayloadItem[] | undefined)?.[0]?.payload;
                        if (!active || !point) return null;
                        return (
                            <ChartTooltipBox
                                title={point.period}
                                rows={[
                                    {
                                        label: seriesLabel,
                                        value: point.value === null ? 'Sin datos' : formatValue(point.value),
                                    },
                                ]}
                            />
                        );
                    }}
                />
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke={CHART_COLORS.series}
                    strokeWidth={2}
                    connectNulls={false}
                    isAnimationActive={false}
                    dot={{ r: 2.5, fill: CHART_COLORS.series, strokeWidth: 0 }}
                    activeDot={{
                        r: 5,
                        fill: CHART_COLORS.series,
                        stroke: CHART_COLORS.surface,
                        strokeWidth: 2,
                    }}
                />
            </LineChart>
        </ResponsiveContainer>
    </div>
);
