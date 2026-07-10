import * as Sentry from '@sentry/node';

export function initSentry() {
    const dsn = process.env.SENTRY_DSN;

    if (!dsn) return null;

    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development'
    });

    return Sentry;
}
