import { memo, type CSSProperties } from 'react';

/*
 * Kit de placeholders del panel de admin. Antes cada módulo resolvía su carga
 * como quería -- Miembros/Registros/Períodos/Proyectos/Usuarios con
 * TableSkeleton, Variables y Unidades de Observación con un spinner centrado,
 * Análisis y los modales de gráfico con otro -- así que pasar de una pestaña a
 * otra cambiaba la forma de "esto está cargando". Acá viven todas las formas,
 * y todas se montan con las mismas reglas de tiempo (useDelayedLoading):
 * nada antes de 250ms, y un mínimo de 500ms en pantalla una vez montadas.
 *
 * Regla común a todos: el cromo estático de la vista (título, buscador,
 * botones, tabs) NO se reemplaza por un placeholder -- se dibuja de una y el
 * skeleton ocupa sólo el área de datos. Es la razón por la que estas formas
 * son parciales y no pantallas completas.
 */

type SkeletonVariant = 'text' | 'rectangular' | 'circular';

export interface SkeletonProps {
    className?: string;
    variant?: SkeletonVariant;
    width?: string | number;
    height?: string | number;
    circle?: boolean;
}

// Bloque base. El tinte y el shimmer viven en la clase .skeleton
// (nocturne.css); acá sólo se resuelven forma y medidas.
export const Skeleton = memo(({ className = '', variant = 'rectangular', width, height, circle = false }: SkeletonProps) => {
    const shape: Record<SkeletonVariant, string> = {
        text: 'rounded-sm',
        rectangular: 'rounded-md',
        circular: 'rounded-full',
    };

    const styles: CSSProperties = {
        width: width || '100%',
        height: height || (variant === 'text' ? '1rem' : '100%'),
    };

    return (
        <div
            className={`skeleton ${circle ? 'rounded-full' : shape[variant]} ${className}`}
            style={styles}
            aria-hidden="true"
        />
    );
});
Skeleton.displayName = 'Skeleton';

export interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}

// Anchos fijos por posición, no aleatorios: con Math.random() cada re-render
// redibuja las barras con otro largo y el skeleton "tiembla".
const CELL_WIDTHS = ['70%', '45%', '85%', '55%', '75%', '50%', '65%', '40%'];

/*
 * Las tablas de admin comparten estructura (celdas `py-3 px-4`, filas
 * separadas por --color-divider, encabezado con borde inferior), así que el
 * placeholder es una tabla de verdad y no una pila de rectángulos: con la
 * misma grilla y el mismo alto de fila, al llegar los datos nada se corre.
 * La primera columna es siempre el ID (angosta) y la última, Acciones
 * (alineada a la derecha).
 */
export const TableSkeleton = memo(({ rows = 5, columns = 4 }: TableSkeletonProps) => {
    const cols = Array.from({ length: columns });

    return (
        <div className="overflow-x-auto" aria-hidden="true">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b text-left" style={{ borderColor: 'var(--color-divider)' }}>
                        {cols.map((_, j) => (
                            <th key={j} className="py-3 px-4">
                                <Skeleton
                                    variant="text"
                                    height="13px"
                                    // El encabezado son palabras sueltas ("ID",
                                    // "Nombre", "Acciones"), no oraciones: si la
                                    // última columna toma un % del ancho sobrante
                                    // queda una barra larguísima donde el texto
                                    // real ocupa 50px.
                                    width={j === 0 ? '24px' : j === columns - 1 ? '56px' : '60%'}
                                    className={j === columns - 1 ? 'ml-auto' : ''}
                                />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, i) => (
                        <tr key={i} className="border-b last:border-none" style={{ borderColor: 'var(--color-divider)' }}>
                            {cols.map((_, j) => (
                                <td key={j} className="py-3 px-4">
                                    <Skeleton
                                        variant="text"
                                        height="16px"
                                        width={
                                            j === 0 ? '20px'
                                                : j === columns - 1 ? '48px'
                                                    : CELL_WIDTHS[(i + j) % CELL_WIDTHS.length]
                                        }
                                        className={j === columns - 1 ? 'ml-auto' : ''}
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});
TableSkeleton.displayName = 'TableSkeleton';

export interface ListSkeletonProps {
    rows?: number;
    /** Bloque a la derecha de cada fila (el contador de unidades asignadas). */
    trailing?: boolean;
}

// Filas de "nombre + subtítulo", la forma de las listas que no son tablas
// (el selector de estudiantes de Asignaciones).
export const ListSkeleton = memo(({ rows = 6, trailing = true }: ListSkeletonProps) => (
    <div aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
            <div
                key={i}
                className="flex items-center justify-between gap-2 p-3 border-t first:border-t-0"
                style={{ borderColor: 'var(--color-divider)' }}
            >
                <div className="min-w-0 flex-1">
                    <Skeleton variant="text" height="17px" width={CELL_WIDTHS[i % CELL_WIDTHS.length]} />
                    <Skeleton variant="text" height="15px" width="52%" className="mt-1.5" />
                </div>
                {trailing && <Skeleton variant="rectangular" width="30px" height="19px" className="flex-shrink-0" />}
            </div>
        ))}
    </div>
));
ListSkeleton.displayName = 'ListSkeleton';

export interface ChartSkeletonProps {
    height?: number;
}

/*
 * Los gráficos de recharts se montan en una caja de alto fijo. El placeholder
 * la ocupa entera dibujando el esqueleto del plot -- eje Y, barras de altura
 * despareja, eje X -- en vez de un spinner centrado que deja el modal
 * cambiando de alto cuando llegan los datos.
 */
const BAR_HEIGHTS = ['45%', '72%', '38%', '88%', '60%', '52%', '78%'];

export const ChartSkeleton = memo(({ height = 300 }: ChartSkeletonProps) => (
    <div className="flex gap-3" style={{ width: '100%', height }} aria-hidden="true">
        {/* eje Y */}
        <div className="flex flex-col justify-between py-1">
            {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="text" width="32px" height="11px" />
            ))}
        </div>

        <div className="flex flex-1 flex-col">
            <div className="flex flex-1 items-end gap-3 border-b border-l pb-0" style={{ borderColor: 'var(--color-divider)' }}>
                {BAR_HEIGHTS.map((h, i) => (
                    <div key={i} className="flex-1" style={{ height: h }}>
                        <Skeleton variant="rectangular" height="100%" />
                    </div>
                ))}
            </div>
            {/* eje X */}
            <div className="flex gap-3 pt-2">
                {BAR_HEIGHTS.map((_, i) => (
                    <div key={i} className="flex flex-1 justify-center">
                        <Skeleton variant="text" width="60%" height="11px" />
                    </div>
                ))}
            </div>
        </div>
    </div>
));
ChartSkeleton.displayName = 'ChartSkeleton';

// Los nombres de campo de estudio son cortos y de largo dispar, así que van
// en px y no en % (dentro de un flex, un % se mide contra la fila entera).
const FIELD_ROW_WIDTHS = ['150px', '96px', '190px', '124px'];

/*
 * El informe de Análisis: la tira de totales por unidad (grid de 3) y la
 * tarjeta de "Análisis por Campo de Estudio" con sus filas de acordeón.
 */
export const AnalysisSkeleton = memo(() => (
    <div className="space-y-6" aria-hidden="true">
        <div>
            <Skeleton variant="text" width="180px" height="22px" className="mb-3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[0, 1, 2].map(i => (
                    <div key={i} className="card elev-sm p-4">
                        <Skeleton variant="text" width="55%" height="13px" />
                        <Skeleton variant="text" width="70%" height="26px" className="mt-3" />
                        <Skeleton variant="text" width="40%" height="15px" className="mt-2" />
                    </div>
                ))}
            </div>
        </div>

        <div className="card elev-sm p-6">
            <Skeleton variant="text" width="260px" height="22px" className="mb-4" />
            <div className="flex flex-col gap-3">
                {FIELD_ROW_WIDTHS.map((width, i) => (
                    <div key={i} className="card elev-sm p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            {/* nombre del campo + tag de unidad + "n cuant. · m cual." */}
                            <Skeleton variant="text" width={width} height="17px" />
                            <Skeleton variant="rectangular" width="52px" height="18px" />
                            <Skeleton variant="text" width="96px" height="14px" />
                        </div>
                        {/* chevron del AccordionTrigger */}
                        <Skeleton variant="text" width="16px" height="16px" className="flex-shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    </div>
));
AnalysisSkeleton.displayName = 'AnalysisSkeleton';
