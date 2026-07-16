import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle } from './dialog';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

// Mismo API de siempre (isOpen/onClose/title/children) -- call sites
// (DistributionChartModal, HistoricalChartModal) sin cambios -- pero
// implementado sobre Dialog (focus-trap, Escape, overlay reales) en vez
// del div .fixed inset-0 a mano.
export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="rounded-[var(--nc-radius-lg)] w-full max-w-lg sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogTitle className="text-xl font-medium text-ink">{title}</DialogTitle>
            {children}
        </DialogContent>
    </Dialog>
);
