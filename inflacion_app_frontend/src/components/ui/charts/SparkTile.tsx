import { Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { CHART_COLORS, formatPercent } from './chartTheme';
import { ChartTooltipBox } from './ChartTooltipBox';

export interface SparkTilePoint {
    period: string;
    value: number | null;
}

export interface SparkTileProps {
    title: string;
    badge?: string;
    /** Último valor de la serie, ya formateado. */
    value: string;
    /** Variación del último período contra el anterior con datos. */
    variation: number | null;
    data: SparkTilePoint[];
    formatValue: (value: number) => string;
}

interface TooltipPayloadItem {
    payload?: SparkTilePoint;
}

/*
 * Celda de los múltiplos pequeños: cada campo de estudio con su propia escala.
 *
 * Escala propia y no compartida a propósito -- una canasta de ₲50.000 y otra
 * de ₲2.000 en el mismo eje dejan a la segunda como una raya plana. Acá lo que
 * se compara entre celdas es la FORMA de la serie, no su altura; los niveles
 * se leen en el número de cada tarjeta y en la tabla.
 */
export const SparkTile = ({ title, badge, value, variation, data, formatValue }: SparkTileProps) => {
    const observed = data.filter(point => point.value !== null).length;

    return (
    <div
        className="rounded-[var(--nc-radius-md)] p-3"
        style={{ border: '1px solid var(--color-divider)' }}
    >
        <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm text-ink truncate" title={title}>{title}</p>
            {badge && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-accent-800/30 text-accent-300 shrink-0">
                    {badge}
                </span>
            )}
        </div>

        <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-medium text-ink">{value}</span>
            <span
                className={`text-xs font-semibold ${
                    variation === null ? 'text-muted' : variation >= 0 ? 'text-danger' : 'text-success'
                }`}
            >
                {formatPercent(variation)}
            </span>
        </div>

        {observed === 0 ? (
            <p className="h-12 mt-2 flex items-center text-xs text-muted">
                Sin datos en períodos cerrados.
            </p>
        ) : (
        <div className="h-12 mt-2 -mx-1">
            <ResponsiveContainer>
                <LineChart data={data} margin={{ top: 4, right: 4, bottom: 2, left: 4 }}>
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
                                            label: title,
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
                        // Un punto suelto no dibuja línea: sin marca, la celda
                        // queda vacía y se lee como "sin datos" cuando en
                        // realidad hay un período relevado. Con dos o más, los
                        // puntos sobran y ensucian la forma.
                        dot={observed === 1 ? { r: 2.5, fill: CHART_COLORS.series, strokeWidth: 0 } : false}
                        activeDot={{
                            r: 4,
                            fill: CHART_COLORS.series,
                            stroke: CHART_COLORS.surface,
                            strokeWidth: 2,
                        }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
        )}
    </div>
    );
};
