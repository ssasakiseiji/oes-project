-- =====================================================
-- Portal IPC - Script de Inicialización para Supabase
-- =====================================================
-- Este script crea todas las tablas, índices y datos iniciales
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- 1. CREAR TABLAS
-- =====================================================

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    roles TEXT[] NOT NULL DEFAULT '{"student"}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Categorías
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Productos
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Comercios
CREATE TABLE IF NOT EXISTS commerces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Períodos
CREATE TABLE IF NOT EXISTS periods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Open', 'Closed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(month, year)
);

-- Tabla de Precios
CREATE TABLE IF NOT EXISTS prices (
    id SERIAL PRIMARY KEY,
    price DECIMAL(10, 2) NOT NULL,
    period_id INTEGER REFERENCES periods(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    commerce_id INTEGER REFERENCES commerces(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Borradores de Precios
CREATE TABLE IF NOT EXISTS draft_prices (
    id SERIAL PRIMARY KEY,
    price DECIMAL(10, 2) NOT NULL,
    period_id INTEGER REFERENCES periods(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    commerce_id INTEGER REFERENCES commerces(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Asignaciones de Comercios
CREATE TABLE IF NOT EXISTS commerce_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    commerce_id INTEGER NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(user_id, commerce_id)
);

-- =====================================================
-- 2. CREAR ÍNDICES PARA MEJOR RENDIMIENTO
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_prices_period ON prices(period_id);
CREATE INDEX IF NOT EXISTS idx_prices_product ON prices(product_id);
CREATE INDEX IF NOT EXISTS idx_prices_user ON prices(user_id);
CREATE INDEX IF NOT EXISTS idx_prices_commerce ON prices(commerce_id);
CREATE INDEX IF NOT EXISTS idx_draft_prices_user_commerce_period ON draft_prices(user_id, commerce_id, period_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_commerce_assignments_user ON commerce_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_commerce_assignments_commerce ON commerce_assignments(commerce_id);

-- =====================================================
-- 3. INSERTAR DATOS INICIALES
-- =====================================================

-- Insertar Categorías
INSERT INTO categories (name) VALUES
    ('Alimentos'),
    ('Bebidas'),
    ('Productos de Limpieza'),
    ('Productos de Cuidado Personal'),
    ('Lácteos')
ON CONFLICT DO NOTHING;

-- Insertar Productos
INSERT INTO products (name, unit, category_id) VALUES
    ('Arroz', '1 kg', 1),
    ('Frijoles', '1 kg', 1),
    ('Aceite', '1 L', 1),
    ('Azúcar', '1 kg', 1),
    ('Pan', '500 g', 1),
    ('Leche', '1 L', 5),
    ('Queso', '500 g', 5),
    ('Yogurt', '1 L', 5),
    ('Coca Cola', '2 L', 2),
    ('Agua', '1.5 L', 2),
    ('Jugo', '1 L', 2),
    ('Detergente', '1 kg', 3),
    ('Jabón', '1 unidad', 3),
    ('Champú', '400 ml', 4),
    ('Pasta Dental', '1 unidad', 4)
ON CONFLICT DO NOTHING;

-- Insertar Comercios
INSERT INTO commerces (name, address) VALUES
    ('Supermercado Central', 'Av. Principal 123'),
    ('Tienda La Economía', 'Calle 5 # 45-67'),
    ('Minimarket San José', 'Carrera 10 # 20-30'),
    ('Supermercado Express', 'Av. Comercial 456')
ON CONFLICT DO NOTHING;

-- Insertar Usuarios de Prueba
-- IMPORTANTE: Estas son credenciales de PRUEBA
-- Cambiar las contraseñas después del primer acceso
-- Credenciales de prueba:
--   admin@portalipc.com / admin123
--   monitor@portalipc.com / monitor123
--   juan@portalipc.com / student123
--   maria@portalipc.com / student123
--   carlos@portalipc.com / student123
INSERT INTO users (name, email, password_hash, roles) VALUES
    ('Admin Usuario', 'admin@portalipc.com', '$2b$10$P6Ca1MqjGNSYrZRY9aOLjusjtdfV5QGxq6EXPgsmCd8lYx/Lh/sma', '{"admin"}'),
    ('Monitor Usuario', 'monitor@portalipc.com', '$2b$10$O6WVztZ.aeZ9fGmSjnVM/uc5qhYTqEJ0KoboZ3y.hJBl98lMky2E6', '{"monitor"}'),
    ('Juan Pérez', 'juan@portalipc.com', '$2b$10$qLffeSaE7T7UaboNoZjGl.XiPJGiqDFjWcJf.Bp2BkeBw7AaGO.xa', '{"student"}'),
    ('María García', 'maria@portalipc.com', '$2b$10$qLffeSaE7T7UaboNoZjGl.XiPJGiqDFjWcJf.Bp2BkeBw7AaGO.xa', '{"student"}'),
    ('Carlos López', 'carlos@portalipc.com', '$2b$10$qLffeSaE7T7UaboNoZjGl.XiPJGiqDFjWcJf.Bp2BkeBw7AaGO.xa', '{"student"}')
ON CONFLICT (email) DO NOTHING;

-- Insertar Períodos de Ejemplo
INSERT INTO periods (name, month, year, start_date, end_date, status) VALUES
    ('Enero 2025', 1, 2025, '2025-01-01', '2025-01-31', 'Closed'),
    ('Febrero 2025', 2, 2025, '2025-02-01', '2025-02-28', 'Closed'),
    ('Marzo 2025', 3, 2025, '2025-03-01', '2025-03-31', 'Closed'),
    ('Octubre 2025', 10, 2025, '2025-10-01', '2025-10-31', 'Open')
ON CONFLICT (month, year) DO NOTHING;

-- Asignar todos los comercios a todos los estudiantes (por defecto)
INSERT INTO commerce_assignments (user_id, commerce_id)
SELECT u.id, c.id
FROM users u
CROSS JOIN commerces c
WHERE 'student' = ANY(u.roles)
ON CONFLICT (user_id, commerce_id) DO NOTHING;

-- =====================================================
-- SCRIPT COMPLETADO
-- =====================================================
-- Próximos pasos:
-- 1. Las contraseñas de los usuarios deben actualizarse
-- 2. Usar el script update-passwords.js desde el backend
-- 3. O crear usuarios manualmente desde el panel de Admin
