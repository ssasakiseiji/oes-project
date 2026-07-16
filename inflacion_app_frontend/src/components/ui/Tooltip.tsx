import type { ReactNode } from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

export interface TooltipProps {
    children: ReactNode;
    content: ReactNode;
    className?: string;
}

// Mismo API simple de siempre (children + content) para no tocar los ~7
// call sites -- pero implementado sobre el primitivo real de Radix (delay,
// teclado, ARIA) en vez del div hand-rolled con onMouseEnter/onMouseLeave.
export const Tooltip = ({ children, content, className }: TooltipProps) => (
    <TooltipPrimitive.Provider delayDuration={200}>
        <TooltipPrimitive.Root>
            <TooltipPrimitive.Trigger asChild>
                {children}
            </TooltipPrimitive.Trigger>
            <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content
                    sideOffset={6}
                    className={cn(
                        'z-50 rounded-[var(--nc-radius-sm)] bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0',
                        className
                    )}
                >
                    {content}
                </TooltipPrimitive.Content>
            </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
);
