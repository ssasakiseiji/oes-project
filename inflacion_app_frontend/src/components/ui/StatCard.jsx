import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Tooltip } from './Tooltip';

export const StatCard = ({ title, value, change, icon, color = 'blue', sparklineData = null }) => {
    const colorMap = {
        blue: { stroke: '#3b82f6', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
        green: { stroke: '#10b981', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
        purple: { stroke: '#8b5cf6', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
        orange: { stroke: '#f97316', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
        red: { stroke: '#ef4444', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' }
    };

    const colors = colorMap[color] || colorMap.blue;

    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
                    {change !== null && typeof change !== 'undefined' && (
                        <p className={`text-sm font-semibold flex items-center ${change >= 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {change >= 0 ? '▲' : '▼'} {change.toFixed(2)}%
                        </p>
                    )}
                </div>
                <Tooltip content={title}>
                    <div className={`${colors.bg} ${colors.text} p-3 rounded-full`}>{icon}</div>
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
