import React from 'react';
import { Home, ChevronRight } from 'lucide-react';

export const Breadcrumbs = ({ items }) => (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <Home size={16} className="text-gray-500 dark:text-gray-500" />
        {items.map((item, index) => (
            <React.Fragment key={index}>
                <ChevronRight size={14} className="text-gray-400 dark:text-gray-600" />
                <span
                    className={`${
                        index === items.length - 1
                            ? 'text-blue-600 dark:text-blue-400 font-semibold'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    } ${item.onClick ? 'cursor-pointer' : ''}`}
                    onClick={item.onClick}
                >
                    {item.label}
                </span>
            </React.Fragment>
        ))}
    </nav>
);
