import type { ComponentType } from 'react';
import Contexto from './slides/01-contexto';
import Dominio from './slides/02-dominio';
import Roles from './slides/03-roles';
import Analisis from './slides/04-analisis';
import Stack from './slides/05-stack';
import Futuro from './slides/06-futuro';
import Gracias from './slides/07-gracias';

// Registro y ORDEN de la presentación. Reordenar = mover líneas de este array.
// Agregar una diapositiva = crear el archivo en slides/ y sumarlo acá; el
// contador, los puntos de progreso y las páginas del PDF salen de slides.length,
// no hay otro lugar que tocar.
export const slides: ComponentType[] = [
    Contexto,
    Dominio,
    Roles,
    Analisis,
    Stack,
    Futuro,
    Gracias,
];
