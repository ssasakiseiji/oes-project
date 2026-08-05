import { Slide, Titulo, Subtitulo, Columnas, Stat, Bullets } from '../layout';

// Bloques en uso: Stat (números grandes) + Bullets.
//
// Todos los datos de esta diapositiva salen del motor de análisis real
// (backend src/admin/analysis.ts):
//  - 2σ es el umbral de descarte de atípicos en summarizeNumeric().
//  - Los 4 tipos de dato son Variable.dataType en prisma/schema.prisma.
//  - La comparación siempre es de a dos períodos (observationsA/observationsB).
//  - Las tres reglas de abajo son las tres invariantes que el archivo documenta:
//    agrupar solo por unidad compartida, usar solo el set comparable, y
//    devolver null (que la UI muestra como "—") en vez de cero.

export default function Analisis() {
    return (
        <Slide kicker="Análisis">
            <Titulo>¿Qué se obtiene de los datos?</Titulo>

            <Subtitulo>
                El sistema compara dos períodos y calcula la variación de cada variable y
                de cada campo de estudio, separando lo que se mide en números de lo que se
                mide en respuestas.
            </Subtitulo>

            <Columnas cantidad={3} className="mt-[clamp(0.5rem,2vh,1.25rem)]">
                <Stat
                    valor="2σ"
                    etiqueta="Umbral de descarte de valores atípicos"
                    detalle="Se aplica variable por variable antes de promediar"
                />
                <Stat
                    valor="4"
                    etiqueta="Tipos de dato analizados"
                    detalle="Numérico, opción de lista, sí/no y texto libre"
                />
                <Stat
                    valor="2"
                    etiqueta="Períodos por comparación"
                    detalle="Un período actual contra una base anterior"
                />
            </Columnas>

            <Bullets
                items={[
                    'Solo se agregan juntas las variables que comparten la misma unidad de medida',
                    'Al total solo entran las variables que fueron observadas en ambos períodos',
                    'Cuando no hay dato suficiente se muestra «—», nunca un cero',
                ]}
            />
        </Slide>
    );
}
