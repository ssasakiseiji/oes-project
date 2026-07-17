import type { ReactNode } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Tooltip } from './Tooltip';

type StatCardColor = 'blue' | 'green' | 'purple' | 'orange' | 'red';

export interface StatCardProps {
    title: string;
    value: ReactNode;
    change?: number | null;
    icon: ReactNode;
    color?: StatCardColor;
    // Línea de contexto bajo el valor (ej. el valor del período base con el que
    // se está comparando). Agregado en Fase AB.
    subtitle?: ReactNode;
    sparklineData?: { value: number }[] | null;
}

// Nocturne no tiene una rampa por color -- blue/purple mapean al acento
// primario/secundario existentes, green/red a success/danger, orange (sin
// call sites hoy) también al acento secundario en vez de inventar un hue.
const colorMap: Record<StatCardColor, { stroke: string; iconClass: string }> = {
    blue: { stroke: 'var(--color-accent)', iconClass: 'text-accent-300 bg-accent-800/40' },
    purple: { stroke: 'var(--color-accent-2)', iconClass: 'text-accent-2-300 bg-accent-2-800/40' },
    orange: { stroke: 'var(--color-accent-2)', iconClass: 'text-accent-2-300 bg-accent-2-800/40' },
    green: { stroke: 'var(--color-success)', iconClass: 'text-success bg-success/15' },
    red: { stroke: 'var(--color-danger)', iconClass: 'text-danger bg-danger/15' },
};

export const StatCard = ({ title, value, change, icon, color = 'blue', subtitle = null, sparklineData = null }: StatCardProps) => {
    const colors = colorMap[color] || colorMap.blue;

    return (
        <div className="card elev-sm p-5">
            <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                    <p className="text-sm text-muted font-medium">{title}</p>
                    <p className="text-3xl font-medium text-ink">{value}</p>
                    {change !== null && typeof change !== 'undefined' && (
                        <p className={`text-sm font-semibold flex items-center ${change >= 0 ? 'text-danger' : 'text-success'}`}>
                            {change >= 0 ? '▲' : '▼'} {change.toFixed(2)}%
                        </p>
                    )}
                    {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
                </div>
                <Tooltip content={title}>
                    <div className={`${colors.iconClass} p-3 rounded-full`}>{icon}</div>
                </Tooltip>
            </div>
            {sparklineData && sparklineData.length > 0 && (
                <div className="h-12 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparklineData}>
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke={colors.stroke}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};
