import { memo } from 'react';
import { Skeleton } from './ui/skeletons';

// Placeholders propios del panel de estudiante. El bloque base y las formas
// compartidas con el panel de admin (tabla, lista, gráfico) viven en
// ui/skeletons.tsx.

interface TaskCardSkeletonProps {
  // Los títulos reales tienen largos distintos; con todas las barras del
  // mismo ancho la lista se lee como una tabla y no como tarjetas.
  titleWidth?: string;
}

/*
 * Calca la fila de <AccordionTrigger> de una tarjeta de tarea en
 * StudentDashboard: misma caja (`card card-flat p-3`, no `card elev-sm`, que
 * pintaba una superficie que la tarjeta real no tiene), mismo anillo de 48px,
 * mismas TRES líneas de texto -- título, tag de estado y contador de
 * variables -- y el chevron de 16px del trigger a la derecha. Antes eran dos
 * líneas y un círculo de 20px en la derecha, así que al llegar los datos la
 * tarjeta crecía y toda la lista saltaba hacia abajo.
 */
export const TaskCardSkeleton = memo(({ titleWidth = '55%' }: TaskCardSkeletonProps) => (
  <div className="card card-flat p-3">
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        {/* anillo de progreso */}
        <Skeleton circle width="48px" height="48px" className="flex-shrink-0" />

        <div className="min-w-0 flex-1">
          {/* card-title text-base sm:text-lg */}
          <Skeleton variant="text" width={titleWidth} height="20px" />
          {/* .tag */}
          <Skeleton variant="rectangular" width="74px" height="19px" className="mt-1" />
          {/* contador "x / y variables" */}
          <Skeleton variant="text" width="90px" height="17px" className="mt-1" />
        </div>
      </div>

      {/* chevron del AccordionTrigger */}
      <Skeleton variant="text" width="16px" height="16px" className="flex-shrink-0" />
    </div>
  </div>
));

TaskCardSkeleton.displayName = 'TaskCardSkeleton';

// Anchos de título fijos por posición (no aleatorios): con Math.random() cada
// re-render redibuja las barras con otro largo y el skeleton "tiembla".
const TASK_TITLE_WIDTHS = ['58%', '42%', '66%', '48%'];

/*
 * Espejo del encabezado real: título a la izquierda y el selector de período
 * -- un pill chico con su leyenda de estado debajo -- arriba a la derecha, en
 * la misma línea. Antes el selector se dibujaba como un campo de 40px de alto
 * a todo el ancho debajo del título, que no es la forma que tiene desde el
 * rediseño: al cargar, el bloque entero se reacomodaba.
 */
export const DashboardSkeleton = memo(() => (
  <div>
    <div className="flex items-start justify-between gap-3 mb-6">
      {/* h2 "Tus Tareas" (text-2xl -> 32px de caja) */}
      <Skeleton variant="text" width="150px" height="32px" />

      <div className="flex flex-col items-end flex-shrink-0">
        {/* botón del PeriodDropdown */}
        <Skeleton circle width="150px" height="30px" />
        {/* leyenda de estado (ACTIVO / VENCIDO / PROGRAMADO) */}
        <Skeleton variant="text" width="56px" height="11px" className="mt-1 mr-1" />
      </div>
    </div>

    <hr className="hr" />

    {/* Mismo contenedor que el <Accordion>: flex-col gap-3 mt-3 */}
    <div className="flex flex-col gap-3 mt-3">
      {TASK_TITLE_WIDTHS.map((width, i) => (
        <TaskCardSkeleton key={i} titleWidth={width} />
      ))}
    </div>
  </div>
));

DashboardSkeleton.displayName = 'DashboardSkeleton';
