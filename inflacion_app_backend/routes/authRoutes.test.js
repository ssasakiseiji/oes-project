import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';

// Evita que server.js llame app.listen() y abra un puerto real durante los tests
process.env.VERCEL = '1';

jest.unstable_mockModule('../services/authService.js', () => ({
    authService: {
        login: jest.fn(),
        getUserById: jest.fn(),
    }
}));

const { authService } = await import('../services/authService.js');
const { default: app } = await import('../server.js');

describe('POST /api/login', () => {
    it('rechaza credenciales faltantes con 400', async () => {
        const res = await request(app).post('/api/login').send({});
        expect(res.status).toBe(400);
    });

    it('rechaza un email con formato inválido con 400', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ email: 'no-es-un-email', password: 'secreto' });
        expect(res.status).toBe(400);
    });

    it('devuelve 200 y un token con credenciales válidas', async () => {
        authService.login.mockResolvedValue({
            token: 'fake.jwt.token',
            user: { id: 1, name: 'Test User', roles: ['student'] }
        });

        const res = await request(app)
            .post('/api/login')
            .send({ email: 'test@test.com', password: 'secreto' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
    });

    it('devuelve 401 con credenciales incorrectas', async () => {
        authService.login.mockRejectedValue(new Error('Credenciales incorrectas'));

        const res = await request(app)
            .post('/api/login')
            .send({ email: 'test@test.com', password: 'incorrecta' });

        expect(res.status).toBe(401);
    });
});

describe('GET /api/me', () => {
    it('requiere token de autenticación (401 si falta)', async () => {
        const res = await request(app).get('/api/me');
        expect(res.status).toBe(401);
    });
});
