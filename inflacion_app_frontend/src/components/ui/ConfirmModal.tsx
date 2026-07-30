import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from './alert-dialog';

export interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    confirmType?: 'danger' | 'primary';
}

// Mismo API de siempre -- call sites (ObservationsManager, MembersManager,
// PlatformUsersManager x2) sin cambios -- pero implementado sobre
// AlertDialog en vez del div .fixed inset-0 a mano.
export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', confirmType = 'danger' }: ConfirmModalProps) => (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <AlertDialogContent className="rounded-[var(--nc-radius-lg)]">
            <AlertDialogTitle className="text-ink">{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted">{message}</AlertDialogDescription>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction variant={confirmType === 'danger' ? 'destructive' : 'default'} onClick={onConfirm}>
                    {confirmText}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);
