import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { Button } from './button';

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

export const Pagination = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }: PaginationProps) => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-2" style={{ borderTop: '1px solid var(--color-divider)' }}>
            <div className="text-sm text-muted">
                Mostrando <span className="font-medium text-ink">{startItem}</span> a <span className="font-medium text-ink">{endItem}</span> de <span className="font-medium text-ink">{totalItems}</span> resultados
            </div>
            <div className="flex items-center gap-1">
                <Tooltip content="Primera página">
                    <Button variant="secondary" size="icon-sm" onClick={() => onPageChange(1)} disabled={currentPage === 1}>
                        <ChevronsLeft size={18} />
                    </Button>
                </Tooltip>
                <Tooltip content="Página anterior">
                    <Button variant="secondary" size="icon-sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
                        <ChevronLeft size={18} />
                    </Button>
                </Tooltip>
                <span className="px-3 py-1 text-sm text-muted">
                    Página <span className="font-medium text-ink">{currentPage}</span> de <span className="font-medium text-ink">{totalPages}</span>
                </span>
                <Tooltip content="Página siguiente">
                    <Button variant="secondary" size="icon-sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                        <ChevronRight size={18} />
                    </Button>
                </Tooltip>
                <Tooltip content="Última página">
                    <Button variant="secondary" size="icon-sm" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}>
                        <ChevronsRight size={18} />
                    </Button>
                </Tooltip>
            </div>
        </div>
    );
};
