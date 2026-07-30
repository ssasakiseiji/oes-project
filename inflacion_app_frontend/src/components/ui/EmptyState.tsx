import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: ReactNode;
}

export const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--color-nc-neutral-800)' }}>
            <Icon size={40} className="text-muted" />
        </div>
        <h3 className="text-xl font-medium text-ink mb-2">{title}</h3>
        <p className="text-muted text-center max-w-md mb-6">{description}</p>
        {action}
    </div>
);
