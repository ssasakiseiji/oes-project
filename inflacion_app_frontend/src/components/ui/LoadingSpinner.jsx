import { Loader } from 'lucide-react';

export const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full w-full p-10">
        <Loader className="animate-spin text-blue-600 dark:text-blue-400" size={40} />
    </div>
);
