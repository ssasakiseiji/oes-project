-- Script de Datos de Prueba para InflaciónApp

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
-- Password para todos: "password123"
-- Hash generado con bcrypt (rounds=10)
INSERT INTO users (name, email, password_hash, roles) VALUES
    ('Admin Usuario', 'admin@test.com', '$2b$10$rXvzE2CJXgZLqKjH8qKjVOLKZjF6hQ.7EqH5KjD8pBYN8yZxV.GNm', '{"admin"}'),
    ('Monitor Usuario', 'monitor@test.com', '$2b$10$rXvzE2CJXgZLqKjH8qKjVOLKZjF6hQ.7EqH5KjD8pBYN8yZxV.GNm', '{"monitor"}'),
    ('Juan Pérez', 'juan@test.com', '$2b$10$rXvzE2CJXgZLqKjH8qKjVOLKZjF6hQ.7EqH5KjD8pBYN8yZxV.GNm', '{"student"}'),
    ('María García', 'maria@test.com', '$2b$10$rXvzE2CJXgZLqKjH8qKjVOLKZjF6hQ.7EqH5KjD8pBYN8yZxV.GNm', '{"student"}'),
    ('Carlos López', 'carlos@test.com', '$2b$10$rXvzE2CJXgZLqKjH8qKjVOLKZjF6hQ.7EqH5KjD8pBYN8yZxV.GNm', '{"student"}')
ON CONFLICT (email) DO NOTHING;

-- Insertar Períodos de Ejemplo
INSERT INTO periods (name, month, year, start_date, end_date, status) VALUES
    ('Enero 2025', 1, 2025, '2025-01-01', '2025-01-31', 'Closed'),
    ('Febrero 2025', 2, 2025, '2025-02-01', '2025-02-28', 'Closed'),
    ('Marzo 2025', 3, 2025, '2025-03-01', '2025-03-31', 'Closed'),
    ('Octubre 2025', 10, 2025, '2025-10-01', '2025-10-31', 'Open')
ON CONFLICT (month, year) DO NOTHING;
