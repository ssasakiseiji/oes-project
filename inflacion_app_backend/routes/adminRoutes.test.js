import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.VERCEL = '1';

const { default: app } = await import('../server.js');

describe('Autorización de rutas de admin', () => {
    it('rechaza acceso sin token con 401', async () => {
        const res = await request(app).get('/api/users');
        expect(res.status).toBe(401);
    });

    it('rechaza usuarios sin rol admin con 403', async () => {
        const token = jwt.sign(
            { id: 2, name: 'Estudiante', roles: ['student'] },
            process.env.JWT_SECRET
        );

        const res = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
    });
});
