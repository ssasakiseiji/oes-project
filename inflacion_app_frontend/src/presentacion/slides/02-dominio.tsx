import type { ReactNode } from 'react';
import { Slide, Titulo, Subtitulo, DosColumnas } from '../layout';

// Bloques en uso: DosColumnas, con una lista de término + definición escrita
// acá abajo (no hay bloque para eso en layout/ y no hace falta: se usa una
// sola vez).
//
// Los seis conceptos y sus relaciones salen de prisma/schema.prisma:
// Project → StudyField → Variable, y ObservationUnit + Period + Observation.

interface Concepto {
    termino: string;
    definicion: string;
}

const ESTRUCTURA: Concepto[] = [
    {
        termino: 'Proyecto',
        definicion:
            'Cada investigación es independiente: tiene sus propios campos, variables, unidades y períodos.',
    },
    {
        termino: 'Campo de estudio',
        definicion:
            'Agrupa variables afines y define la unidad en la que se miden, por ejemplo guaraníes o grados.',
    },
    {
        termino: 'Variable',
        definicion:
            'Lo que se mide. Puede ser un número, una opción de una lista, un sí/no o un texto libre.',
    },
];

const RELEVAMIENTO: Concepto[] = [
    {
        termino: 'Unidad de observación',
        definicion:
            'El lugar donde se releva el dato. Cada estudiante tiene asignadas las suyas.',
    },
    {
        termino: 'Período',
        definicion:
            'La ventana de tiempo del relevamiento. Solo se pueden cargar datos mientras está abierta.',
    },
    {
        termino: 'Observación',
        definicion:
            'El dato cargado: uno por estudiante, variable, unidad de observación y período.',
    },
];

function Grupo({ titulo, conceptos }: { titulo: ReactNode; conceptos: Concepto[] }) {
    return (
        <>
            <h3 className="text-ink font-medium mb-5 text-[clamp(1.1rem,1.7vw,1.5rem)]">
                {titulo}
            </h3>
            <dl className="flex flex-col gap-[clamp(0.85rem,2.2vh,1.5rem)]">
                {conceptos.map(concepto => (
                    <div key={concepto.termino}>
                        <dt className="text-accent text-[clamp(1rem,1.5vw,1.3rem)]">
                            {concepto.termino}
                        </dt>
                        <dd className="text-ink/70 leading-snug text-[clamp(0.9rem,1.3vw,1.15rem)]">
                            {concepto.definicion}
                        </dd>
                    </div>
                ))}
            </dl>
        </>
    );
}

export default function Dominio() {
    return (
        <Slide kicker="Estructura">
            <Titulo>¿Cómo se organizan los datos?</Titulo>

            <Subtitulo>
                Cada dato cargado queda ubicado en una estructura que define qué se mide,
                dónde y cuándo. Esa estructura la arma el administrador según lo que
                necesite su investigación.
            </Subtitulo>

            <DosColumnas
                izquierda={<Grupo titulo="Qué se mide" conceptos={ESTRUCTURA} />}
                derecha={<Grupo titulo="Dónde y cuándo se mide" conceptos={RELEVAMIENTO} />}
            />
        </Slide>
    );
}
