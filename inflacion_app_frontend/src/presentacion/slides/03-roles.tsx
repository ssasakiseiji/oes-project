import { Slide, Titulo, Columnas, Bullets } from '../layout';

// Bloques en uso: Columnas cantidad={3}, con un encabezado propio por columna.
const ROLES = [
    { nombre: 'Estudiante', items: ['Recolecta datos para la investigación', 'Tiene definidas sus tareas y progreso'] },
    { nombre: 'Monitor', items: ['Supervisa la actividad de los estudiantes', 'Permite evaluar los desempeños y actividad'] },
    { nombre: 'Administrador', items: ['Observa las métricas y analiza los datos recolectados', 'Administra el proyecto de investigación y supervisa los datos'] },
];

export default function Roles() {
    return (
        <Slide kicker="Roles">
            <Titulo>¿Quiénes participan en la plataforma?</Titulo>

            <Columnas cantidad={3}>
                {ROLES.map(rol => (
                    <div key={rol.nombre}>
                        <h3 className="text-ink font-medium mb-3 text-[clamp(1.1rem,1.7vw,1.5rem)]">
                            {rol.nombre}
                        </h3>
                        <Bullets items={rol.items} />
                    </div>
                ))}
            </Columnas>
        </Slide>
    );
}
