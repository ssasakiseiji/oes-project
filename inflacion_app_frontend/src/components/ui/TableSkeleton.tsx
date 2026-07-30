export interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}

export const TableSkeleton = ({ rows = 5, columns = 4 }: TableSkeletonProps) => (
    <div className="animate-pulse space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4">
                {Array.from({ length: columns }).map((_, j) => (
                    <div key={j} className="h-12 rounded flex-1" style={{ background: 'var(--color-nc-neutral-800)' }}></div>
                ))}
            </div>
        ))}
    </div>
);
