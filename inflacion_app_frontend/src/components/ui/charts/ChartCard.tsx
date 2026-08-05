import { useState, type ReactNode } from 'react';
import { BarChart2, Table2 } from 'lucide-react';
import { Button } from '../button';
import { Tooltip } from '../Tooltip';

export interface ChartTableView {
    columns: string[];
    /** Alineación por columna; por defecto la primera a la izquierda y el resto a la derecha. */
    align?: ('left' | 'right')[];
    rows: ReactNode[][];
}

export interface ChartCardProps {
    title: string;
    /** Qué responde el gráfico y con qué regla se calculó. */
    description?: ReactNode;
    /** Control propio del gráfico (elegir variable, unidad...). */
    action?: ReactNode;
    /** Nota al pie: exclusiones, recortes, advertencias de método. */
    footnote?: ReactNode;
    /**
     * Los mismos datos en tabla. No es opcional por capricho: un valor que solo
     * se puede leer pasando el mouse por encima es un valor que no está para
     * quien navega con teclado, exporta, o simplemente quiere el número exacto.
     */
    table: ChartTableView;
    children: ReactNode;
}

export const ChartCard = ({
    title,
    description,
    action,
    footnote,
    table,
    children,
}: ChartCardProps) => {
    const [showTable, setShowTable] = useState(false);
    const align = table.align ?? table.columns.map((_, i) => (i === 0 ? 'left' : 'right'));

    return (
        <section className="card elev-sm p-4 gap-0">
            {/* La descripción va en su propia fila y no al lado del título: en
                dos columnas competía por el ancho con la cifra de la derecha y
                se partía en tres líneas contra el borde de esta. */}
            <header className="mb-3">
                <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-medium text-ink min-w-0">{title}</h4>
                    <div className="flex items-center gap-2 shrink-0">
                        {action}
                        <Tooltip content={showTable ? 'Ver gráfico' : 'Ver tabla'}>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={showTable ? 'Ver gráfico' : 'Ver tabla'}
                                aria-pressed={showTable}
                                onClick={() => setShowTable(v => !v)}
                                className="text-muted hover:text-ink"
                            >
                                {showTable ? <BarChart2 size={16} /> : <Table2 size={16} />}
                            </Button>
                        </Tooltip>
                    </div>
                </div>
                {/* min-h de dos líneas: cuando dos cards caen lado a lado, una
                    descripción de una línea y otra de dos desalinean los plots
                    entre sí y las series parecen arrancar a distinta altura. */}
                {description && <p className="text-xs text-muted mt-1.5 min-h-8">{description}</p>}
            </header>

            {showTable ? (
                <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b" style={{ borderColor: 'var(--color-divider)' }}>
                                {table.columns.map((column, i) => (
                                    <th
                                        key={column}
                                        className={`p-2 font-medium text-muted text-xs ${align[i] === 'right' ? 'text-right' : 'text-left'}`}
                                    >
                                        {column}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {table.rows.map((row, rowIndex) => (
                                <tr
                                    key={rowIndex}
                                    className="border-b last:border-none"
                                    style={{ borderColor: 'var(--color-divider)' }}
                                >
                                    {row.map((cell, cellIndex) => (
                                        <td
                                            key={cellIndex}
                                            className={`p-2 text-ink ${align[cellIndex] === 'right' ? 'text-right tabular-nums' : 'text-left'}`}
                                        >
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                children
            )}

            {footnote && <p className="text-xs text-muted mt-3">{footnote}</p>}
        </section>
    );
};
