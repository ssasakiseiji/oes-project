import { Users, Store } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './popover';

export interface PopoverItem {
    id: number;
    name: string;
    email?: string;
    address?: string | null;
}

export interface StudentCommercePopoverProps {
    items?: PopoverItem[];
    type?: 'students' | 'observationUnits';
}

// Antes: un botón-badge que abría un Modal completo para una lista corta
// de nombres. Conceptualmente es solo texto anclado a un botón -- pasa a
// un Popover de verdad en vez de un Dialog más.
export const StudentCommercePopover = ({ items = [], type = 'students' }: StudentCommercePopoverProps) => {
    const count = items.length;
    const Icon = type === 'students' ? Users : Store;

    if (count === 0) {
        return <span className="text-muted text-sm italic">Ninguno</span>;
    }

    if (count === 1) {
        return <span className="text-ink font-medium">{items[0].name}</span>;
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className="tag tag-accent inline-flex items-center gap-1.5 cursor-pointer">
                    <Icon size={14} />
                    <span>{count} {type === 'students' ? 'estudiantes' : 'unidades'}</span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0 gap-0" align="start">
                <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: 'var(--color-divider)' }}>
                    <Icon size={16} className="text-accent-300" />
                    <h4 className="font-medium text-ink text-sm">
                        {type === 'students' ? 'Estudiantes Asignados' : 'Unidades Asignadas'}
                    </h4>
                </div>
                <div className="max-h-72 overflow-y-auto">
                    {items.map((item, i) => (
                        <div
                            key={item.id}
                            className={`px-3 py-2.5 ${i > 0 ? 'border-t' : ''}`}
                            style={i > 0 ? { borderColor: 'var(--color-divider)' } : undefined}
                        >
                            <div className="font-medium text-sm text-ink">{item.name}</div>
                            {item.email && <div className="text-xs text-muted mt-0.5">{item.email}</div>}
                            {item.address && <div className="text-xs text-muted mt-0.5">{item.address}</div>}
                        </div>
                    ))}
                </div>
                <div className="px-3 py-2 border-t text-xs text-muted text-center" style={{ borderColor: 'var(--color-divider)' }}>
                    Total: <span className="font-medium text-ink">{count}</span> {type === 'students' ? 'estudiante(s)' : 'unidad(es)'}
                </div>
            </PopoverContent>
        </Popover>
    );
};
