import { Slide, Titulo, Nota } from '../layout';

// Cierre. Sin kicker y centrada: es la única diapositiva que no argumenta nada,
// así que tampoco necesita el rótulo de sección ni la alineación a la izquierda
// que ordena la lectura en las demás.
export default function Gracias() {
    return (
        <Slide className="text-center">
            <Titulo>Gracias por su atención</Titulo>

            <Nota>
                Observatorio Económico y Social · Facultad de Ciencias Económicas y
                Administrativas · Universidad Nacional de Itapúa
            </Nota>
        </Slide>
    );
}
