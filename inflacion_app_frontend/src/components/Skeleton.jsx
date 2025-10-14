import React from 'react';
import PropTypes from 'prop-types';

// Componente base de Skeleton con animación de shimmer
const Skeleton = React.memo(({ className = '', variant = 'rectangular', width, height, circle = false }) => {
  const baseClasses = 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%]';

  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
  };

  const styles = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1rem' : '100%'),
  };

  if (circle) {
    return (
      <div
        className={`${baseClasses} rounded-full ${className}`}
        style={styles}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={styles}
      aria-hidden="true"
    />
  );
});

Skeleton.displayName = 'Skeleton';

Skeleton.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(['text', 'rectangular', 'circular']),
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  circle: PropTypes.bool,
};

// Skeleton para tarjeta de tarea
export const TaskCardSkeleton = React.memo(() => (
  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-2xl space-y-3">
    <div className="flex items-center gap-3 sm:gap-4 p-3">
      {/* Circular progress skeleton */}
      <Skeleton circle width="48px" height="48px" />

      {/* Content skeleton */}
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" height="20px" />
        <Skeleton variant="text" width="40%" height="16px" />
      </div>

      {/* Arrow icon skeleton */}
      <Skeleton circle width="20px" height="20px" />
    </div>
  </div>
));

TaskCardSkeleton.displayName = 'TaskCardSkeleton';

// Skeleton para dashboard completo
export const DashboardSkeleton = React.memo(() => (
  <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-4 sm:p-6 md:p-8 rounded-2xl shadow-lg">
    {/* Header skeleton */}
    <div className="flex flex-col gap-4 mb-6">
      <Skeleton variant="text" width="150px" height="32px" />
      <div className="flex gap-3">
        <Skeleton variant="rectangular" width="100%" height="40px" className="sm:w-64" />
      </div>
    </div>

    {/* Tasks skeleton */}
    <div className="space-y-3">
      <TaskCardSkeleton />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
    </div>
  </div>
));

DashboardSkeleton.displayName = 'DashboardSkeleton';

// Skeleton para lista de categorías
export const CategoryListSkeleton = React.memo(() => (
  <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-2xl space-y-3 mt-4">
    <Skeleton variant="text" width="120px" height="16px" />
    {[1, 2, 3].map(i => (
      <div key={i} className="bg-white dark:bg-gray-800 p-3 rounded-xl">
        <div className="flex justify-between items-center">
          <Skeleton variant="text" width="40%" height="18px" />
          <Skeleton variant="text" width="60px" height="16px" />
        </div>
      </div>
    ))}
  </div>
));

CategoryListSkeleton.displayName = 'CategoryListSkeleton';

export default Skeleton;
