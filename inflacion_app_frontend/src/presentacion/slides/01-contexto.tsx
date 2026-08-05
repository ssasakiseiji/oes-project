import { Slide, Titulo, Subtitulo, Bullets } from '../layout';

// Bloques en uso: Titulo + Subtitulo + Bullets.
export default function Contexto() {
    return (
        <Slide kicker="Contexto">
            <Titulo>¿En qué consiste el proyecto?</Titulo>

            <Subtitulo>El proyecto nace desde la iniciativa de incoporar tecnología para agilizar los procesos derivados de la recolección de datos. Es de suma importancia valorar el tiempo de los involucrados en la investigación, este proyecto busca ser un instrumento para facilitar a los docentes, alumnos, y personas en general a ser partícipes de actividades de investigación.</Subtitulo>

            <Bullets
                items={[
                    'Información centralizada y almacenada de forma adecuada',
                    'Análisis automático de datos recolectados',
                    'Mejor experiencia para todos los involucrados en la investigación',
                ]}
            />
        </Slide>
    );
}
