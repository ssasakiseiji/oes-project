import { Prisma } from '@prisma/client';

// Fase Z/AA: motor de análisis, extraído de AdminService a funciones puras.
//
// Por qué sale del service: la lógica de agregación dejó de ser "sumar precios"
// y pasó a tener reglas propias (homogeneidad por unidad, cuali/cuanti, set
// comparable entre períodos) que se entienden y se testean mejor sin Prisma ni
// Nest alrededor. El service queda solo con el fetch + la delegación.
//
// Reglas de agregación (decididas con el usuario):
//  - La CATEGORÍA de una variable se deriva del dataType: numeric =>
//    cuantitativa; categorical/boolean/text => cualitativa. Sin columna nueva.
//  - Un campo de estudio PUEDE mezclar tipos. La unidad aplica solo al bloque
//    cuantitativo; el cualitativo se analiza por frecuencias.
//  - Solo se agregan juntas variables que comparten StudyField.unitOfMeasure.
//    Un campo con variables numéricas pero SIN unidad declarada no se agrega:
//    se reporta aparte para que el admin cargue la unidad, en vez de sumarlo a
//    ciegas (que es el bug que esta fase existe para eliminar).

export type AggregateMethod = 'sum' | 'mean';

export interface FrequencyEntry {
  value: string;
  count: number;
  share: number;
}

export interface QuantitativeVariableAnalysis {
  id: number;
  name: string;
  unit: string | null;
  isCurrency: boolean;
  valueA: number | null;
  valueB: number | null;
  variation: number | null;
  sampleA: number;
  sampleB: number;
}

export interface QualitativeVariableAnalysis {
  id: number;
  name: string;
  dataType: 'categorical' | 'boolean' | 'text';
  distributionA: FrequencyEntry[];
  distributionB: FrequencyEntry[];
  responsesA: number;
  responsesB: number;
}

// isCurrency se expone explícitamente aunque hoy sea equivalente a
// `method === 'sum'`: el frontend lo necesita para elegir el formato (moneda vs
// número + unidad), y hacerlo deducir eso de `method` ataría el formateo a una
// invariante implícita que nadie prometió mantener.
export interface StudyFieldAggregate {
  method: AggregateMethod;
  isCurrency: boolean;
  valueA: number | null;
  valueB: number | null;
  variation: number | null;
  comparableVariables: number;
  excludedVariables: number;
}

export interface StudyFieldAnalysis {
  id: number;
  name: string;
  unitOfMeasure: string | null;
  quantitative: QuantitativeVariableAnalysis[];
  qualitative: QualitativeVariableAnalysis[];
  aggregate: StudyFieldAggregate | null;
}

export interface UnitTotal {
  unitOfMeasure: string;
  method: AggregateMethod;
  isCurrency: boolean;
  valueA: number | null;
  valueB: number | null;
  variation: number | null;
  studyFieldIds: number[];
}

export interface AnalysisResult {
  studyFieldAnalysis: StudyFieldAnalysis[];
  unitTotals: UnitTotal[];
  unitlessNumericStudyFields: { id: number; name: string }[];
}

export interface AnalysisStudyFieldInput {
  id: number;
  name: string;
  unitOfMeasure: string | null;
}

export interface AnalysisVariableInput {
  id: number;
  name: string;
  unit: string | null;
  dataType: string;
  config: Prisma.JsonValue | null;
  studyFieldId: number | null;
}

export interface AnalysisObservationInput {
  variableId: number | null;
  numericValue: Prisma.Decimal | null;
  textValue: string | null;
  booleanValue: boolean | null;
  choiceValue: string | null;
}

export interface BuildAnalysisInput {
  studyFields: AnalysisStudyFieldInput[];
  variables: AnalysisVariableInput[];
  observationsA: AnalysisObservationInput[];
  observationsB: AnalysisObservationInput[];
}

interface NumericSummary {
  avg: number;
  sample: number;
}

export function isCurrencyVariable(variable: AnalysisVariableInput): boolean {
  return (
    (variable.config as { isCurrency?: boolean } | null)?.isCurrency === true
  );
}

// Convención de signo, heredada del análisis pre-Fase-AA y del orden que ya
// usa la UI: A es el período comparado ("actual"), B es la base ("anterior").
//
// Devuelve null (en vez del viejo `costA > 0 ? 100 : 0`) cuando la variación es
// genuinamente indefinida: sin base con la que comparar, o base cero. Reportar
// "100%" para un salto desde 0 era inventar un número; la UI ahora muestra
// "—". Ojo: base 0 y valor 0 sí es una variación real de 0%.
export function calculateVariation(
  valueA: number | null,
  valueB: number | null,
): number | null {
  if (valueA == null || valueB == null) return null;
  if (valueB === 0) return valueA === 0 ? 0 : null;
  return ((valueA - valueB) / valueB) * 100;
}

// Media por variable con descarte de outliers por la regla de 2-sigma —
// idéntica a la del getAnalysis pre-Fase-AA y a la de getObservations, para que
// el promedio que muestra el análisis coincida con el que marca los outliers en
// la grilla de Registros.
function summarizeNumeric(
  rows: AnalysisObservationInput[],
): Map<number, NumericSummary> {
  const valueMap = new Map<number, number[]>();

  rows.forEach((row) => {
    if (row.variableId == null || row.numericValue == null) return;
    const value = Number(row.numericValue);
    if (isNaN(value)) return;
    if (!valueMap.has(row.variableId)) valueMap.set(row.variableId, []);
    valueMap.get(row.variableId)!.push(value);
  });

  const summaries = new Map<number, NumericSummary>();
  valueMap.forEach((values, variableId) => {
    if (values.length === 0) return;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev =
      values.length > 1
        ? Math.sqrt(
            values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
              values.length,
          )
        : 0;

    const filtered =
      stdDev > 0
        ? values.filter((v) => Math.abs(v - mean) <= 2 * stdDev)
        : values;

    if (filtered.length > 0) {
      summaries.set(variableId, {
        avg: filtered.reduce((a, b) => a + b, 0) / filtered.length,
        sample: filtered.length,
      });
    }
  });

  return summaries;
}

// Frecuencias por variable cualitativa. Las booleanas se emiten como 'true'/
// 'false' (no 'Sí'/'No') a propósito: es exactamente lo que ya devuelve
// getVariableDistribution, así que el frontend reusa el mismo mapeo de
// etiquetas para ambos endpoints en vez de tener dos convenciones.
function summarizeQualitative(
  rows: AnalysisObservationInput[],
): Map<number, { counts: Map<string, number>; responses: number }> {
  const byVariable = new Map<
    number,
    { counts: Map<string, number>; responses: number }
  >();

  rows.forEach((row) => {
    if (row.variableId == null) return;

    let value: string | null = null;
    if (row.choiceValue != null) value = row.choiceValue;
    else if (row.booleanValue != null) value = String(row.booleanValue);
    else if (row.textValue != null && row.textValue.trim() !== '')
      // El texto libre cuenta como respuesta pero no entra en la distribución
      // (ver más abajo): 40 respuestas abiertas distintas no son una
      // frecuencia, son 40 barras de altura 1.
      value = '';
    else return;

    if (!byVariable.has(row.variableId)) {
      byVariable.set(row.variableId, { counts: new Map(), responses: 0 });
    }
    const entry = byVariable.get(row.variableId)!;
    entry.responses += 1;
    if (value !== '') {
      entry.counts.set(value, (entry.counts.get(value) ?? 0) + 1);
    }
  });

  return byVariable;
}

function toFrequencyEntries(
  counts: Map<string, number> | undefined,
): FrequencyEntry[] {
  if (!counts || counts.size === 0) return [];
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return [...counts.entries()]
    .map(([value, count]) => ({
      value,
      count,
      share: total > 0 ? count / total : 0,
    }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

// Agrega un set de valores ya promediados por variable.
//  - 'sum'  => canasta: la suma solo tiene sentido si TODAS las variables son
//              monetarias (sumar 3 precios da un costo total).
//  - 'mean' => promedio simple entre variables: sumar dos lecturas de °C no
//              significa nada, promediarlas sí.
// En ambos casos se usa únicamente el SET COMPARABLE (variables con valor en
// los dos períodos). Ver aggregateStudyField.
function aggregateValues(
  values: number[],
  method: AggregateMethod,
): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return method === 'sum' ? sum : sum / values.length;
}

function aggregateStudyField(
  quantitative: QuantitativeVariableAnalysis[],
  unitOfMeasure: string | null,
): StudyFieldAggregate | null {
  // Sin unidad declarada no se agrega nada: es justamente el caso que producía
  // números sin sentido antes (promediar ₲/kg con ₲/400ml, sumar °C con ₲).
  if (unitOfMeasure == null || quantitative.length === 0) return null;

  const isCurrency = quantitative.every((v) => v.isCurrency);
  const method: AggregateMethod = isCurrency ? 'sum' : 'mean';

  // Set comparable: solo variables observadas en AMBOS períodos. Si una
  // variable existe en A pero no en B, incluirla inflaría/desinflaría un lado
  // de la comparación y produciría una variación fantasma que no ocurrió. El
  // getAnalysis anterior hacía `avgValues.get(id) || 0`, tratando "sin datos"
  // como precio 0 — una variable no relevada se veía como una caída de precio
  // a cero y arrastraba la canasta entera hacia abajo.
  const comparable = quantitative.filter(
    (v) => v.valueA != null && v.valueB != null,
  );

  const valueA = aggregateValues(
    comparable.map((v) => v.valueA!),
    method,
  );
  const valueB = aggregateValues(
    comparable.map((v) => v.valueB!),
    method,
  );

  return {
    method,
    isCurrency,
    valueA,
    valueB,
    variation: calculateVariation(valueA, valueB),
    comparableVariables: comparable.length,
    excludedVariables: quantitative.length - comparable.length,
  };
}

export interface StudyFieldHistoryInputRow {
  periodId: number;
  name: string;
  variableId: number;
  avgValue: Prisma.Decimal | null;
}

export interface HistoryRow {
  name: string;
  avgValue: number | null;
}

// Historial agregado de un campo de estudio, período a período.
//
// Arregla dos defectos reales del getVariableHistory pre-Fase-AA, que hacía un
// AVG(numeric_value) plano sobre TODAS las observaciones del campo:
//  1. Promediaba observación por observación, no variable por variable, así que
//     una variable con el triple de observaciones pesaba el triple en la media.
//  2. Mezclaba variables no comparables entre sí. Para 'Alimentos' eso
//     promediaba el precio del arroz por kg con el del champú por 400 ml y
//     devolvía un número que no significa nada. Ahora la unidad la garantiza
//     StudyField.unitOfMeasure (el caller exige que esté declarada) y el método
//     lo decide isCurrency, igual que en buildAnalysis.
//
// Para 'sum' (canasta) se usa además el SET COMPARABLE: solo las variables
// presentes en TODOS los períodos con datos. Si no, un período al que le falta
// una variable muestra una caída de la canasta que nunca ocurrió — sería el
// mismo bug de "sin datos = 0" pero desplegado sobre el eje del tiempo.
// Para 'mean' no hace falta: promediar un subconjunto distinto de variables
// sigue siendo un promedio válido de lo que se observó ese período.
export function buildStudyFieldHistory(
  rows: StudyFieldHistoryInputRow[],
  method: AggregateMethod,
): HistoryRow[] {
  const periods: { id: number; name: string; values: Map<number, number> }[] =
    [];
  const periodIndex = new Map<number, number>();

  rows.forEach((row) => {
    if (row.avgValue == null) return;
    const value = Number(row.avgValue);
    if (isNaN(value)) return;

    if (!periodIndex.has(row.periodId)) {
      periodIndex.set(row.periodId, periods.length);
      periods.push({ id: row.periodId, name: row.name, values: new Map() });
    }
    periods[periodIndex.get(row.periodId)!].values.set(row.variableId, value);
  });

  if (periods.length === 0) return [];

  let comparable: Set<number> | null = null;
  if (method === 'sum') {
    comparable = new Set(periods[0].values.keys());
    periods.slice(1).forEach((period) => {
      comparable = new Set(
        [...comparable!].filter((variableId) => period.values.has(variableId)),
      );
    });
  }

  return periods.map((period) => {
    const values = [...period.values.entries()]
      .filter(
        ([variableId]) => comparable == null || comparable.has(variableId),
      )
      .map(([, value]) => value);
    return { name: period.name, avgValue: aggregateValues(values, method) };
  });
}

export function buildAnalysis(input: BuildAnalysisInput): AnalysisResult {
  const { studyFields, variables, observationsA, observationsB } = input;

  const numericA = summarizeNumeric(observationsA);
  const numericB = summarizeNumeric(observationsB);
  const qualitativeA = summarizeQualitative(observationsA);
  const qualitativeB = summarizeQualitative(observationsB);

  const studyFieldAnalysis: StudyFieldAnalysis[] = studyFields.map((field) => {
    const fieldVariables = variables.filter((v) => v.studyFieldId === field.id);

    const quantitative: QuantitativeVariableAnalysis[] = fieldVariables
      .filter((v) => v.dataType === 'numeric')
      .map((v) => {
        const a = numericA.get(v.id);
        const b = numericB.get(v.id);
        const valueA = a?.avg ?? null;
        const valueB = b?.avg ?? null;
        return {
          id: v.id,
          name: v.name,
          unit: v.unit,
          isCurrency: isCurrencyVariable(v),
          valueA,
          valueB,
          variation: calculateVariation(valueA, valueB),
          sampleA: a?.sample ?? 0,
          sampleB: b?.sample ?? 0,
        };
      });

    const qualitative: QualitativeVariableAnalysis[] = fieldVariables
      .filter((v) => v.dataType !== 'numeric')
      .map((v) => {
        const a = qualitativeA.get(v.id);
        const b = qualitativeB.get(v.id);
        return {
          id: v.id,
          name: v.name,
          dataType: v.dataType as 'categorical' | 'boolean' | 'text',
          distributionA: toFrequencyEntries(a?.counts),
          distributionB: toFrequencyEntries(b?.counts),
          responsesA: a?.responses ?? 0,
          responsesB: b?.responses ?? 0,
        };
      });

    return {
      id: field.id,
      name: field.name,
      unitOfMeasure: field.unitOfMeasure,
      quantitative,
      qualitative,
      aggregate: aggregateStudyField(quantitative, field.unitOfMeasure),
    };
  });

  // Totales por unidad: reemplazan al viejo total único de canasta, que sumaba
  // TODA variable monetaria del proyecto sin mirar la unidad. Se agrupa por
  // unitOfMeasure y se agrega sobre las variables (no sobre los subtotales por
  // campo) para que 'mean' sea el promedio real entre variables y no un
  // promedio de promedios ponderado por cuántas variables tenga cada campo.
  const byUnit = new Map<
    string,
    { fields: StudyFieldAnalysis[]; variables: QuantitativeVariableAnalysis[] }
  >();

  studyFieldAnalysis.forEach((field) => {
    if (field.unitOfMeasure == null || field.quantitative.length === 0) return;
    if (!byUnit.has(field.unitOfMeasure)) {
      byUnit.set(field.unitOfMeasure, { fields: [], variables: [] });
    }
    const entry = byUnit.get(field.unitOfMeasure)!;
    entry.fields.push(field);
    entry.variables.push(...field.quantitative);
  });

  const unitTotals: UnitTotal[] = [...byUnit.entries()]
    .map(([unitOfMeasure, { fields, variables: unitVariables }]) => {
      const isCurrency = unitVariables.every((v) => v.isCurrency);
      const method: AggregateMethod = isCurrency ? 'sum' : 'mean';
      const comparable = unitVariables.filter(
        (v) => v.valueA != null && v.valueB != null,
      );
      const valueA = aggregateValues(
        comparable.map((v) => v.valueA!),
        method,
      );
      const valueB = aggregateValues(
        comparable.map((v) => v.valueB!),
        method,
      );

      return {
        unitOfMeasure,
        method,
        isCurrency,
        valueA,
        valueB,
        variation: calculateVariation(valueA, valueB),
        studyFieldIds: fields.map((f) => f.id),
      };
    })
    .sort((a, b) => a.unitOfMeasure.localeCompare(b.unitOfMeasure));

  // Campos con datos cuantitativos que no se pueden agregar porque nadie
  // declaró su unidad. Se devuelven explícitamente en vez de omitirlos en
  // silencio: son trabajo pendiente del admin, y omitirlos sin decir nada es
  // cómo se pierde la mitad de un análisis sin que nadie lo note.
  const unitlessNumericStudyFields = studyFieldAnalysis
    .filter((f) => f.unitOfMeasure == null && f.quantitative.length > 0)
    .map((f) => ({ id: f.id, name: f.name }));

  return { studyFieldAnalysis, unitTotals, unitlessNumericStudyFields };
}
