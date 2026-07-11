import { useState, type ReactNode } from 'react';

export interface TooltipProps {
    children: ReactNode;
    content: ReactNode;
}

export const Tooltip = ({ children, content }: TooltipProps) => {
    const [isVisible, setIsVisible] = useState(false);
    return (
        <div className="relative inline-block">
            <div
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
            >
                {children}
            </div>
            {isVisible && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg whitespace-nowrap z-50 animate-fade-in">
                    {content}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                </div>
            )}
        </div>
    );
};
