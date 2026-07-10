import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

process.env.JWT_SECRET = 'test-jwt-secret-key';

// Equivalente e2e de inflacion_app_backend/routes/authRoutes.test.js y
// adminRoutes.test.js (categories en vez de admin, ya que es el módulo
// portado en esta fase). Se mockea PrismaService para no depender de una
// base de datos real corriendo durante los tests.
const prismaMock = {
  user: { findUnique: jest.fn() },
  category: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  product: { count: jest.fn() },
};

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['/'] });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET / responde con el banner de estado', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('InflaciónApp');
      });
  });

  describe('POST /api/login', () => {
    it('rechaza credenciales faltantes con 400', () => {
      return request(app.getHttpServer())
        .post('/api/login')
        .send({})
        .expect(400);
    });

    it('rechaza un email con formato inválido con 400', () => {
      return request(app.getHttpServer())
        .post('/api/login')
        .send({ email: 'no-es-un-email', password: 'secreto' })
        .expect(400);
    });

    it('devuelve 401 con credenciales incorrectas', () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .post('/api/login')
        .send({ email: 'test@test.com', password: 'incorrecta' })
        .expect(401);
    });

    it('devuelve 200 y un token con credenciales válidas', async () => {
      const passwordHash = await bcrypt.hash('correctpassword', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        passwordHash,
        roles: ['student'],
      });

      const res = await request(app.getHttpServer())
        .post('/api/login')
        .send({ email: 'test@test.com', password: 'correctpassword' })
        .expect(200);

      const body = res.body as { token: string; user: unknown };
      expect(body).toHaveProperty('token');
      expect(body.user).toEqual({
        id: 1,
        name: 'Test User',
        roles: ['student'],
      });
    });
  });

  describe('GET /api/me', () => {
    it('requiere token de autenticación (401 si falta)', () => {
      return request(app.getHttpServer()).get('/api/me').expect(401);
    });
  });

  describe('Autorización de /api/categories', () => {
    it('rechaza acceso sin token con 401', () => {
      return request(app.getHttpServer()).get('/api/categories').expect(401);
    });

    it('rechaza escritura de usuarios sin rol admin con 403', () => {
      const token = jwt.sign(
        { id: 2, name: 'Estudiante', roles: ['student'] },
        process.env.JWT_SECRET as string,
      );

      return request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nueva categoría' })
        .expect(403);
    });

    it('permite lectura a cualquier usuario autenticado', async () => {
      const token = jwt.sign(
        { id: 2, name: 'Estudiante', roles: ['student'] },
        process.env.JWT_SECRET as string,
      );
      prismaMock.category.findMany.mockResolvedValue([
        { id: 1, name: 'Alimentos' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual([{ id: 1, name: 'Alimentos' }]);
    });
  });
});
