import type { ReactNode } from 'react';
import {
    Bar,
    BarChart,
    LabelList,
    Rectangle,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { AXIS_TICK, CHART_COLORS } from './chartTheme';
import { ChartTooltipBox } from './ChartTooltipBox';

export interface DivergingBarRow {
    key: string;
    /** Etiqueta del eje. Se trunca sola si no entra en labelWidth. */
    label: string;
    value: number;
    /** Nombre completo y contexto, para el tooltip. */
    tooltipTitle?: string;
    tooltipRows?: { label: string; value: string }[];
}

export interface DivergingBarChartProps {
    rows: DivergingBarRow[];
    formatValue: (value: number) => string;
    labelWidth?: number;
    /** Alto de cada barra + su aire. Más filas, mismo grosor de marca. */
    rowHeight?: number;
}

const MAX_LABEL_CHARS = 30;

const truncate = (label: string) =>
    label.length > MAX_LABEL_CHARS ? `${label.slice(0, MAX_LABEL_CHARS - 1)}…` : label;

// recharts tipa el formatter de LabelList como (ReactNode) => ReactNode. Se
// montan dos listas, una a cada lado, y cada una escribe solo las barras de su
// signo: `position="right"` cae en la punta de la barra que sube y
// `position="left"` en la de la que baja.
const positiveLabel = (formatValue: (value: number) => string) => (label: ReactNode) =>
    typeof label === 'number' && label >= 0 ? formatValue(label) : '';

const negativeLabel = (formatValue: (value: number) => string) => (label: ReactNode) =>
    typeof label === 'number' && label < 0 ? formatValue(label) : '';

interface BarShapeProps {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    payload?: DivergingBarRow;
}

// Punta redondeada del lado que crece y base cuadrada contra el cero.
// recharts tipa el shape como (props: unknown), así que el estrechamiento va
// acá adentro y no en la firma.
const divergingBarShape = (props: unknown) => {
    const { x = 0, y = 0, width = 0, height = 0, payload } = props as BarShapeProps;
    const value = payload?.value ?? 0;
    const rising = value >= 0;
    return (
        <Rectangle
            x={x}
            y={y}
            width={width}
            height={height}
            fill={rising ? CHART_COLORS.up : CHART_COLORS.down}
            radius={rising ? [0, 4, 4, 0] : [4, 0, 0, 4]}
        />
    );
};

interface TooltipPayloadItem {
    payload?: DivergingBarRow;
}

/*
 * Barras divergentes horizontales: la forma para "de qué lado del cero cayó
 * cada cosa, y cuánto". Horizontal y no vertical porque las etiquetas son
 * nombres largos (variables, campos de estudio) y en columnas quedarían
 * rotadas o recortadas.
 *
 * El color solo dice signo -- danger arriba, success abajo, los mismos tokens
 * con que la app escribe las variaciones en texto. No es identidad de serie:
 * cada barra ya se identifica por su etiqueta en el eje.
 *
 * El valor va escrito en la punta de cada barra, no solo en el tooltip: un
 * número que exige pasar el mouse no existe para quien usa teclado.
 */
export const DivergingBarChart = ({
    rows,
    formatValue,
    labelWidth = 190,
    rowHeight = 30,
}: DivergingBarChartProps) => {
    const values = rows.map(r => r.value);
    const max = Math.max(0, ...values);
    const min = Math.min(0, ...values);
    // Aire a los costados para que la etiqueta de la punta no toque el borde.
    // Con todo en cero el dominio colapsaría a [0, 0] y no habría escala: ahí
    // el padding es fijo.
    const span = Math.max(Math.abs(max), Math.abs(min));
    const padding = span === 0 ? 1 : span * 0.3;

    return (
        // Alto proporcional a las filas: sin banda de eje que reservar (ver
        // abajo), pero con aire para que la última barra no toque el borde.
        <div style={{ width: '100%', height: rows.length * rowHeight + 12 }}>
            <ResponsiveContainer>
                <BarChart
                    layout="vertical"
                    data={rows}
                    margin={{ top: 4, right: 12, bottom: 4, left: 0 }}
                    barCategoryGap="40%"
                >
                    {/* Eje de valores oculto, y sin grilla. Cada barra lleva su
                        número escrito en la punta, así que los ticks solo
                        repetirían lo que ya está y además salen en valores
                        arbitrarios (-0,13%, 0,02%...) porque el dominio se fija
                        a mano para dejarle lugar a esas etiquetas. La referencia
                        que sí hace falta es el cero, y esa la da la línea. */}
                    <XAxis type="number" domain={[min - padding, max + padding]} hide />
                    <YAxis
                        type="category"
                        dataKey="label"
                        width={labelWidth}
                        tick={AXIS_TICK}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={truncate}
                    />
                    <ReferenceLine x={0} stroke={CHART_COLORS.baseline} />
                    <RechartsTooltip
                        cursor={{ fill: 'var(--color-accent-900)', fillOpacity: 0.5 }}
                        content={({ active, payload }) => {
                            const row = (payload as TooltipPayloadItem[] | undefined)?.[0]?.payload;
                            if (!active || !row) return null;
                            return (
                                <ChartTooltipBox
                                    title={row.tooltipTitle ?? row.label}
                                    rows={row.tooltipRows ?? [{ label: 'Valor', value: formatValue(row.value) }]}
                                />
                            );
                        }}
                    />
                    {/* Una sola serie con shape propio. El intento anterior --
                        dos series apiladas, una para cada signo, para poder dar
                        radios distintos por serie -- dejaba media tabla sin
                        dibujar: con un null por fila en una de las dos, recharts
                        no emite los rects ni genera los ticks del eje numérico.
                        Acá el signo decide color y punta redondeada dentro del
                        shape, y la serie nunca tiene huecos. */}
                    <Bar
                        dataKey="value"
                        barSize={14}
                        isAnimationActive={false}
                        shape={divergingBarShape}
                    >
                        <LabelList
                            dataKey="value"
                            position="right"
                            fill="var(--color-ink)"
                            fontSize={11}
                            formatter={positiveLabel(formatValue)}
                        />
                        <LabelList
                            dataKey="value"
                            position="left"
                            fill="var(--color-ink)"
                            fontSize={11}
                            formatter={negativeLabel(formatValue)}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
