import { z } from 'zod';

export const createUserSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    roles: z.array(z.string()).min(1, 'Debe asignar al menos un rol al usuario')
});

export const updateUserPasswordSchema = z.object({
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

export const createPeriodSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido'),
    month: z.union([z.string(), z.number()]),
    year: z.union([z.string(), z.number()]),
    start_date: z.string().min(1, 'start_date es requerido'),
    end_date: z.string().min(1, 'end_date es requerido')
});

export const updatePriceSchema = z.object({
    price: z.union([z.string(), z.number()])
});
