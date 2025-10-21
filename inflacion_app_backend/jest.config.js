export default {
    testEnvironment: 'node',
    transform: {},
    extensionsToTreatAsEsm: ['.js'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    testMatch: [
        '**/__tests__/**/*.js',
        '**/?(*.)+(spec|test).js'
    ],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'services/**/*.js',
        'controllers/**/*.js',
        'routes/**/*.js',
        'middleware/**/*.js',
        '!**/node_modules/**',
        '!**/coverage/**',
    ],
    setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
};
