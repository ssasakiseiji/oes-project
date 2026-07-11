import * as Sentry from '@sentry/react';

declare global {
    interface Window {
        Sentry?: typeof Sentry;
    }
}

export function initSentry() {
    const dsn = import.meta.env.VITE_SENTRY_DSN;

    if (!dsn) return;

    Sentry.init({
        dsn,
        environment: import.meta.env.MODE
    });

    if (typeof window !== 'undefined') {
        window.Sentry = Sentry;
    }
}
