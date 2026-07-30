export const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full w-full p-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--color-accent)' }}></div>
    </div>
);
