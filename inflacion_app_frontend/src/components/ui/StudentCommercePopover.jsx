import React, { useState } from 'react';
import { Users, Store, X } from 'lucide-react';

export const StudentCommercePopover = ({ items = [], type = 'students' }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const count = items.length;
    const Icon = type === 'students' ? Users : Store;

    if (count === 0) {
        return (
            <span className="text-gray-400 dark:text-gray-500 text-sm italic">
                Ninguno
            </span>
        );
    }

    if (count === 1) {
        return (
            <span className="text-gray-800 dark:text-gray-200 font-medium">
                {items[0].name}
            </span>
        );
    }

    // Multiple items - show badge with modal trigger
    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
            >
                <Icon size={14} />
                <span>{count} {type === 'students' ? 'estudiantes' : 'comercios'}</span>
            </button>

            {/* Floating Modal */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <Icon size={20} />
                                {type === 'students' ? 'Estudiantes Asignados' : 'Comercios Asignados'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto flex-grow divide-y divide-gray-100 dark:divide-gray-700">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    <div className="font-semibold text-gray-800 dark:text-gray-200">
                                        {item.name}
                                    </div>
                                    {item.email && (
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            {item.email}
                                        </div>
                                    )}
                                    {item.address && (
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            {item.address}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                                Total: <span className="font-semibold text-gray-800 dark:text-gray-200">{count}</span> {type === 'students' ? 'estudiante(s)' : 'comercio(s)'}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
