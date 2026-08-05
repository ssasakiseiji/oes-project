import type { ReactNode } from 'react';

export interface EmptyStateProps {
    title: string;
    description: string;
    action?: ReactNode;
}

/*
 * Texto y nada más: sin ícono, sin caja y sin borde. Un estado vacío no es
 * contenido -- encerrarlo en una tarjeta con un ícono de 40px dentro de un
 * círculo tintado lo hacía pesar más que la pantalla llena que reemplaza, y
 * en una tabla vacía el bloque terminaba siendo lo más marcado de la vista.
 * Ambas líneas van en el gris secundario; la jerarquía entre titular y
 * detalle la marca el tamaño, no el color. Mismo trato que los estados
 * vacíos del panel de estudiante (NoCollectionPanel / NoTasksPanel).
 */
export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
    <div className="py-12 text-center">
        <p className="text-muted text-sm">{title}</p>
        <p className="text-muted mx-auto mt-1 max-w-md text-xs">{description}</p>
        {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
);
