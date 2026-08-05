import { Slide, Titulo, Nota } from '../layout';

// Esta diapositiva NO usa un bloque prearmado: la grilla está escrita a mano
// acá abajo. Es el ejemplo de la escotilla de escape -- cuando el layout que
// necesitás no existe, lo escribís en el archivo de la diapositiva y listo.
//
// Versiones tomadas de los package.json reales (backend y frontend) y del
// docker-compose.yml (postgres:16-alpine). Si se actualiza una dependencia,
// acá hay que actualizarla a mano.
const TECNOLOGIAS = [
    { nombre: 'NestJS 11', detalle: 'Servidor y API' },
    { nombre: 'PostgreSQL 16', detalle: 'Base de datos' },
    { nombre: 'Prisma 7', detalle: 'Acceso a la base de datos' },
    { nombre: 'React 19', detalle: 'Interfaz de usuario' },
    { nombre: 'TypeScript 5', detalle: 'Un solo lenguaje en todo el proyecto' },
    { nombre: 'Tailwind CSS 4', detalle: 'Diseño e identidad visual' },
];

export default function Stack() {
    return (
        <Slide kicker="Tecnología">
            <Titulo>¿Con qué está construido?</Titulo>

            <div className="grid grid-cols-3 gap-px bg-divider border border-divider rounded-[var(--nc-radius-lg)] overflow-hidden">
                {TECNOLOGIAS.map(tec => (
                    <div key={tec.nombre} className="bg-bg p-[clamp(1rem,2vw,1.75rem)]">
                        <p className="text-accent font-medium text-[clamp(1rem,1.6vw,1.4rem)]">
                            {tec.nombre}
                        </p>
                        <p className="text-muted mt-1 text-[clamp(0.75rem,1.05vw,1rem)]">
                            {tec.detalle}
                        </p>
                    </div>
                ))}
            </div>

            <Nota>
                Además: Vite para el empaquetado, Recharts para los gráficos, Zod para
                validar los datos que entran y JWT + bcrypt para el inicio de sesión.
            </Nota>
        </Slide>
    );
}
