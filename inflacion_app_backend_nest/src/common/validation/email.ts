import { z } from 'zod';

// El email es la clave de búsqueda del login, y en Postgres `=` sobre text es
// case-sensitive: `Admin@portalipc.com` no encontraba al usuario y devolvía
// 401 "Credenciales incorrectas" con la contraseña correcta. Los teclados de
// celular capitalizan la primera letra por defecto y los estudiantes cargan
// datos desde el celular, así que era el camino normal, no un caso borde.
//
// Se normaliza en el borde (todos los schemas que aceptan un email) para que
// lo que se guarda y lo que se busca tengan siempre la misma forma. El trim va
// antes del .email() porque un espacio pegado en un paste hacía fallar la
// validación con "Email inválido" en vez de resolverse solo.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().email('Email inválido'));

// Misma normalización, para usar fuera de Zod (ej. la búsqueda del login, que
// no debe depender de que el DTO haya pasado por acá).
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
