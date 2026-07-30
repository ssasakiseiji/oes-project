-- Fase T (parte 2, 2026-07-14): punto sin retorno de la migración aditiva
-- de Fase O -- ningún guard/controller lee más `users.roles` para
-- admin/monitor/student (todo pasó a ProjectMembership.roles, ver
-- ProjectRolesGuard), así que se retiran esos valores legacy de la columna
-- global. Lo único que puede sobrevivir en users.roles de acá en adelante
-- es 'superadmin'.
UPDATE "users"
SET "roles" = ARRAY(SELECT r FROM unnest("roles") AS r WHERE r = 'superadmin');

-- Un usuario nuevo ya no nace con 'student' global -- ese rol se otorga
-- vía ProjectMembership al crearlo dentro de un proyecto (ver
-- AdminService#createUser) o al asignarle una ObservationUnit (ver
-- ObservationUnitAssignmentsService).
ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT ARRAY[]::TEXT[];
