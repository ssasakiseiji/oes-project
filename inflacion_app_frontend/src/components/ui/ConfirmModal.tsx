export interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    confirmType?: 'danger' | 'primary';
}

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', confirmType = 'danger' }: ConfirmModalProps) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">{title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`px-4 py-2 text-white rounded-lg transition ${
                                confirmType === 'danger'
                                    ? 'bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600'
                                    : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600'
                            }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
