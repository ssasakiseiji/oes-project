import { describe, it, expect, vi, beforeEach } from '@jest/globals';
import { authService } from './authService.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock dependencies
vi.mock('../config/database.js', () => ({
    default: {
        query: vi.fn(),
    },
}));

describe('authService', () => {
    describe('login', () => {
        it('should throw error when user is not found', async () => {
            const pool = (await import('../config/database.js')).default;
            pool.query.mockResolvedValue({ rows: [] });

            await expect(
                authService.login('nonexistent@test.com', 'password')
            ).rejects.toThrow('Credenciales incorrectas');
        });

        it('should throw error when password is incorrect', async () => {
            const pool = (await import('../config/database.js')).default;
            const hashedPassword = await bcrypt.hash('correctpassword', 10);

            pool.query.mockResolvedValue({
                rows: [{
                    id: 1,
                    name: 'Test User',
                    email: 'test@test.com',
                    password_hash: hashedPassword,
                    roles: ['student']
                }]
            });

            await expect(
                authService.login('test@test.com', 'wrongpassword')
            ).rejects.toThrow('Credenciales incorrectas');
        });

        it('should return token and user data when credentials are correct', async () => {
            const pool = (await import('../config/database.js')).default;
            const hashedPassword = await bcrypt.hash('correctpassword', 10);

            pool.query.mockResolvedValue({
                rows: [{
                    id: 1,
                    name: 'Test User',
                    email: 'test@test.com',
                    password_hash: hashedPassword,
                    roles: ['student']
                }]
            });

            const result = await authService.login('test@test.com', 'correctpassword');

            expect(result).toHaveProperty('token');
            expect(result).toHaveProperty('user');
            expect(result.user).toEqual({
                id: 1,
                name: 'Test User',
                roles: ['student']
            });

            // Verify token is valid
            const decoded = jwt.verify(result.token, process.env.JWT_SECRET);
            expect(decoded.id).toBe(1);
            expect(decoded.name).toBe('Test User');
        });
    });
});
