import { Fragment } from 'react';
import { Home, ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
    label: string;
    onClick?: () => void;
}

export const Breadcrumbs = ({ items }: { items: BreadcrumbItem[] }) => (
    <nav className="flex items-center gap-2 text-sm text-muted mb-4">
        <Home size={16} />
        {items.map((item, index) => (
            <Fragment key={index}>
                <ChevronRight size={14} className="opacity-50" />
                <span
                    className={`${
                        index === items.length - 1
                            ? 'text-accent-300 font-medium'
                            : 'text-muted hover:text-ink'
                    } ${item.onClick ? 'cursor-pointer' : ''}`}
                    onClick={item.onClick}
                >
                    {item.label}
                </span>
            </Fragment>
        ))}
    </nav>
);
