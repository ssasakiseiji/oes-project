-- Migration: Add commerce assignments table
-- This allows many-to-many relationship between students and commerces

-- Create commerce_assignments table
CREATE TABLE IF NOT EXISTS commerce_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    commerce_id INTEGER NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(user_id, commerce_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_commerce_assignments_user ON commerce_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_commerce_assignments_commerce ON commerce_assignments(commerce_id);

-- Insert default assignments for existing students (all commerces to all students)
-- This maintains backward compatibility with existing seed data
INSERT INTO commerce_assignments (user_id, commerce_id)
SELECT u.id, c.id
FROM users u
CROSS JOIN commerces c
WHERE 'student' = ANY(u.roles)
ON CONFLICT (user_id, commerce_id) DO NOTHING;

COMMENT ON TABLE commerce_assignments IS 'Manages the assignment of commerces to students';
COMMENT ON COLUMN commerce_assignments.user_id IS 'Student user ID';
COMMENT ON COLUMN commerce_assignments.commerce_id IS 'Commerce ID assigned to the student';
COMMENT ON COLUMN commerce_assignments.assigned_by IS 'Admin user who made the assignment';
