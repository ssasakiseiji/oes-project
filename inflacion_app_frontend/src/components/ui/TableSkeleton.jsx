export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
    <div className="animate-pulse space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4">
                {Array.from({ length: columns }).map((_, j) => (
                    <div key={j} className="h-12 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                ))}
            </div>
        ))}
    </div>
);
