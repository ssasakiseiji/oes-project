import React from 'react';
import PropTypes from 'prop-types';

const LoadingOverlay = React.memo(({ message = 'Guardando...' }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998]" role="status" aria-live="polite">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4 animate-scale-in">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 dark:border-blue-400"></div>
        <p className="text-gray-800 dark:text-gray-100 font-semibold text-center">{message}</p>
      </div>
    </div>
  );
});

LoadingOverlay.displayName = 'LoadingOverlay';

LoadingOverlay.propTypes = {
  message: PropTypes.string,
};

export default LoadingOverlay;
