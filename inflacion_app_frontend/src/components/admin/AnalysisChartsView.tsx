import { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import { apiFetch } from '../../api';
import { getReactSelectStyles } from '../../utils/reactSelectStyles';
import { formatMetric, formatQualitativeValue } from '../../utils/exportUtils';
import { ChartSkeleton } from '../ui/skeletons';
import { LoadingArea } from '../ui/LoadingArea';
import { EmptyState } from '../ui/EmptyState';
import { ChartCard } from '../ui/charts/ChartCard';
import { EvolutionLineChart } from '../ui/charts/EvolutionLineChart';
import { DivergingBarChart, type DivergingBarRow } from '../ui/charts/DivergingBarChart';
import { SharesStackedChart, type ShareCategory, type ShareRow } from '../ui/charts/SharesStackedChart';
import { SparkTile } from '../ui/charts/SparkTile';
import { ORDINAL_RAMP_SIZE, formatPercent, formatSignedPercent } from '../ui/charts/chartTheme';
import type {
    AggregateSeries,
    AnalysisHistory,
    AnalysisResult,
    QualitativeVariableAnalysis,
    StudyFieldAnalysis,
    VariableDistributionEntry,
} from '../../types/api';

// Fase AE: la pestaña de gráficos del análisis.
//
// Qué se muestra y por qué -- cada bloque responde una pregunta distinta, y
// ninguno repite en dibujo lo que la pestaña Resumen ya dice en números:
//
//  1. EVOLUCIÓN (todos los períodos cerrados). El Resumen compara dos períodos
//     y nada más; la serie completa es lo único que muestra si un salto es
//     tendencia o ruido de un mes. Va por unidad, nunca mezclando unidades en
//     un eje (₲ y °C en el mismo plot es el error clásico del doble eje).
//  2. MÚLTIPLOS PEQUEÑOS por campo de estudio: la misma pregunta, una escala
//     por campo, para comparar FORMAS de serie sin que la canasta más cara
//     aplaste al resto.
//  3. QUÉ SE MOVIÓ entre los dos períodos elegidos, por campo y por variable:
//     el ranking que en tabla exige leer 40 filas y ordenar a ojo.
//  4. INCIDENCIA: descompone la variación del total en cuánto puso cada
//     variable. Es lo que separa "el aceite subió 40% pero pesa poco" de "el
//     pan subió 5% y explica la mitad de la suba" -- una lectura que no se
//     puede sacar de la columna de variación por más que se la mire.
//  5. CUALITATIVAS: distribución por período. Hasta ahora estas variables no
//     tenían ninguna vista de evolución en el análisis.

interface AnalysisChartsViewProps {
    projectId: number;
    /** El análisis del par de períodos elegido arriba; null si todavía no hay. */
    report: AnalysisResult | null;
    history: AnalysisHistory | null;
    isLoading: boolean;
    periodALabel: string;
    periodBLabel: string;
}

interface VariableOption {
    value: number;
    label: string;
    dataType: QualitativeVariableAnalysis['dataType'];
}

/** Cuántas barras entran antes de que el ranking deje de leerse de un vistazo. */
const RANKING_LIMIT = 10;
/** Variables con incidencia propia; la cola se pliega en una sola barra. */
const INCIDENCE_LIMIT = 8;

const methodLabel = (series: { method: AggregateSeries['method'] }) =>
    series.method === 'sum' ? 'Canasta' : 'Promedio';

/** Variación entre los dos últimos períodos CON datos de una serie. */
const latestVariation = (values: (number | null)[]) => {
    const observed = values.filter((v): v is number => v !== null);
    if (observed.length < 2) return null;
    const [previous, last] = [observed[observed.length - 2], observed[observed.length - 1]];
    if (previous === 0) return last === 0 ? 0 : null;
    return ((last - previous) / previous) * 100;
};

const lastObserved = (values: (number | null)[]) => {
    for (let i = values.length - 1; i >= 0; i -= 1) {
        if (values[i] !== null) return values[i];
    }
    return null;
};

const SeriesHeadline = ({ value, variation }: { value: string; variation: number | null }) => (
    <div className="text-right">
        <p className="text-lg font-medium text-ink leading-tight">{value}</p>
        <p
            className={`text-xs font-semibold ${
                variation === null ? 'text-muted' : variation >= 0 ? 'text-danger' : 'text-success'
            }`}
        >
            {formatPercent(variation)} vs. período anterior
        </p>
    </div>
);

/*
 * Incidencia de cada variable en la variación del total de su unidad.
 *
 *   incidencia_i = (valorActual_i - valorBase_i) / Σ valorBase * 100
 *
 * La suma de las incidencias da exactamente la variación del total, y vale
 * igual para canasta ('sum') y promedio ('mean'): en el promedio el 1/n
 * aparece arriba y abajo y se cancela. Se calcula sobre el mismo SET
 * COMPARABLE que usa el backend para el total (variables con dato en los dos
 * períodos), porque si no las partes no sumarían el todo.
 */
interface IncidenceEntry {
    key: string;
    variableName: string;
    fieldName: string;
    unitOfMeasure: string | null;
    isCurrency: boolean;
    valueA: number;
    valueB: number;
    variation: number | null;
    weight: number;
    incidence: number;
}

const buildIncidence = (fields: StudyFieldAnalysis[]) => {
    const comparable = fields.flatMap(field =>
        field.quantitative
            .filter(v => v.valueA !== null && v.valueB !== null)
            .map(v => ({ field, variable: v })),
    );

    const baseTotal = comparable.reduce((total, { variable }) => total + variable.valueB!, 0);
    if (comparable.length < 2 || baseTotal === 0) return null;

    const entries: IncidenceEntry[] = comparable.map(({ field, variable }) => ({
        key: `${field.id}-${variable.id}`,
        variableName: variable.name,
        fieldName: field.name,
        unitOfMeasure: field.unitOfMeasure,
        isCurrency: variable.isCurrency,
        valueA: variable.valueA!,
        valueB: variable.valueB!,
        variation: variable.variation,
        weight: variable.valueB! / baseTotal,
        incidence: ((variable.valueA! - variable.valueB!) / baseTotal) * 100,
    }));

    entries.sort((a, b) => Math.abs(b.incidence) - Math.abs(a.incidence));
    return entries;
};

export const AnalysisChartsView = ({
    projectId,
    report,
    history,
    isLoading,
    periodALabel,
    periodBLabel,
}: AnalysisChartsViewProps) => {
    const [qualitativeVariable, setQualitativeVariable] = useState<VariableOption | null>(null);
    const [distribution, setDistribution] = useState<VariableDistributionEntry[]>([]);
    const [isLoadingDistribution, setIsLoadingDistribution] = useState(false);

    const qualitativeOptions = useMemo<VariableOption[]>(() => {
        if (!report) return [];
        return report.studyFieldAnalysis.flatMap(field =>
            field.qualitative
                // El texto libre no tiene distribución que graficar: N respuestas
                // abiertas distintas son N barras de altura 1, no una frecuencia.
                .filter(v => v.dataType !== 'text')
                .map(v => ({
                    value: v.id,
                    label: `${v.name} · ${field.name}`,
                    dataType: v.dataType,
                })),
        );
    }, [report]);

    useEffect(() => {
        setQualitativeVariable(current => {
            if (qualitativeOptions.length === 0) return null;
            const stillThere = current && qualitativeOptions.some(o => o.value === current.value);
            return stillThere ? current : qualitativeOptions[0];
        });
    }, [qualitativeOptions]);

    useEffect(() => {
        if (!qualitativeVariable) {
            setDistribution([]);
            return;
        }
        let cancelled = false;
        setIsLoadingDistribution(true);
        apiFetch<VariableDistributionEntry[]>(
            `/api/variable-distribution?projectId=${projectId}&variableId=${qualitativeVariable.value}`,
        )
            .then(data => {
                if (!cancelled) setDistribution(data);
            })
            .finally(() => {
                if (!cancelled) setIsLoadingDistribution(false);
            });
        return () => {
            cancelled = true;
        };
    }, [projectId, qualitativeVariable]);

    const periodNames = history?.periods.map(p => p.name) ?? [];

    // --- Bloque 3: variación por campo de estudio -----------------------------

    const fieldVariationRows = useMemo<DivergingBarRow[]>(() => {
        if (!report) return [];
        return report.studyFieldAnalysis
            .filter(field => field.aggregate?.variation != null)
            .map(field => ({
                key: String(field.id),
                label: field.name,
                value: field.aggregate!.variation!,
                tooltipTitle: field.name,
                tooltipRows: [
                    {
                        label: periodBLabel,
                        value: formatMetric(field.aggregate!.valueB, field.unitOfMeasure, field.aggregate!.isCurrency),
                    },
                    {
                        label: periodALabel,
                        value: formatMetric(field.aggregate!.valueA, field.unitOfMeasure, field.aggregate!.isCurrency),
                    },
                    { label: 'Variación', value: formatPercent(field.aggregate!.variation) },
                ],
            }))
            .sort((a, b) => b.value - a.value);
    }, [report, periodALabel, periodBLabel]);

    // --- Bloque 4: ranking de variables --------------------------------------

    const variableRanking = useMemo(() => {
        if (!report) return { rows: [] as DivergingBarRow[], total: 0 };
        const all = report.studyFieldAnalysis.flatMap(field =>
            field.quantitative
                .filter(v => v.variation !== null)
                .map(v => ({
                    key: `${field.id}-${v.id}`,
                    label: v.name,
                    value: v.variation!,
                    tooltipTitle: v.name,
                    tooltipRows: [
                        { label: 'Campo', value: field.name },
                        { label: periodBLabel, value: formatMetric(v.valueB, field.unitOfMeasure, v.isCurrency) },
                        { label: periodALabel, value: formatMetric(v.valueA, field.unitOfMeasure, v.isCurrency) },
                        { label: 'Variación', value: formatPercent(v.variation) },
                    ],
                })),
        );
        // Se recortan por |variación| y recién después se ordenan para dibujar:
        // quedarse con las primeras N de una lista ordenada por signo dejaría
        // afuera todas las bajas cuando la mayoría subió.
        const top = [...all]
            .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
            .slice(0, RANKING_LIMIT)
            .sort((a, b) => b.value - a.value);
        return { rows: top, total: all.length };
    }, [report, periodALabel, periodBLabel]);

    // --- Bloque 5: incidencia por unidad -------------------------------------

    const incidenceByUnit = useMemo(() => {
        if (!report) return [];
        return report.unitTotals
            .map(total => {
                const fields = report.studyFieldAnalysis.filter(f => total.studyFieldIds.includes(f.id));
                const entries = buildIncidence(fields);
                return entries ? { total, entries } : null;
            })
            .filter((item): item is { total: (typeof report.unitTotals)[number]; entries: IncidenceEntry[] } =>
                item !== null,
            );
    }, [report]);

    // --- Bloque 6: distribución de una cualitativa ---------------------------

    const shares = useMemo(() => {
        if (distribution.length === 0 || !qualitativeVariable) {
            return { categories: [] as ShareCategory[], rows: [] as ShareRow[] };
        }

        const totals = new Map<string, number>();
        distribution.forEach(entry =>
            Object.entries(entry.counts).forEach(([value, count]) => {
                totals.set(value, (totals.get(value) ?? 0) + count);
            }),
        );

        const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        // La rampa ordinal tiene cinco pasos y un sexto no llegaría al mínimo de
        // contraste, así que la cola se pliega en "Otros" en vez de inventar un
        // color más (que además sería indistinguible del vecino).
        const named = ranked.length > ORDINAL_RAMP_SIZE ? ranked.slice(0, ORDINAL_RAMP_SIZE - 1) : ranked;
        const foldedValues = new Set(ranked.slice(named.length).map(([value]) => value));

        const categories: ShareCategory[] = named.map(([value]) => ({
            key: value,
            label: formatQualitativeValue(value, qualitativeVariable.dataType),
        }));
        if (foldedValues.size > 0) {
            categories.push({ key: '__otros__', label: `Otros (${foldedValues.size})` });
        }

        const rows: ShareRow[] = distribution.map(entry => {
            const counts: Record<string, number> = {};
            categories.forEach(category => {
                counts[category.key] = 0;
            });
            Object.entries(entry.counts).forEach(([value, count]) => {
                const key = foldedValues.has(value) ? '__otros__' : value;
                counts[key] = (counts[key] ?? 0) + count;
            });
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            const entryShares: Record<string, number> = {};
            categories.forEach(category => {
                entryShares[category.key] = total > 0 ? counts[category.key] / total : 0;
            });
            return { period: entry.periodName, total, shares: entryShares, counts };
        });

        return { categories, rows };
    }, [distribution, qualitativeVariable]);

    const hasHistory = (history?.periods.length ?? 0) > 0 && (history?.units.length ?? 0) > 0;

    return (
        <LoadingArea isLoading={isLoading} skeleton={<ChartSkeleton height={360} />}>
            <div className="space-y-8">
                {/* ---------------------------------------------------------------
                    Evolución
                   --------------------------------------------------------------- */}
                <section className="space-y-4">
                    <div>
                        <h3 className="text-lg font-medium text-ink">Evolución</h3>
                        <p className="text-xs text-muted mt-1">
                            Todos los períodos cerrados del proyecto, no solo el par comparado.
                            Los períodos en curso quedan fuera: sus datos a medio relevar
                            hundirían la serie entera.
                        </p>
                    </div>

                    {!hasHistory ? (
                        <EmptyState
                            title="Sin serie histórica"
                            description="Hacen falta períodos cerrados con variables numéricas y una unidad de medida declarada en el campo de estudio."
                        />
                    ) : (
                        <>
                            <div className={`grid gap-4 ${history!.units.length > 1 ? 'xl:grid-cols-2' : ''}`}>
                                {history!.units.map(unit => {
                                    const data = periodNames.map((period, i) => ({
                                        period,
                                        value: unit.values[i],
                                    }));
                                    const format = (value: number) =>
                                        formatMetric(value, unit.unitOfMeasure, unit.isCurrency);
                                    const variation = latestVariation(unit.values);

                                    return (
                                        <ChartCard
                                            key={unit.unitOfMeasure}
                                            title={`${methodLabel(unit)} en ${unit.unitOfMeasure}`}
                                            description={
                                                unit.method === 'sum'
                                                    ? 'Suma de las variables monetarias de la unidad, período a período.'
                                                    : 'Promedio entre las variables de la unidad. No se suman: sumar dos lecturas de la misma magnitud no significa nada.'
                                            }
                                            action={
                                                <SeriesHeadline
                                                    value={formatMetric(
                                                        lastObserved(unit.values),
                                                        unit.unitOfMeasure,
                                                        unit.isCurrency,
                                                    )}
                                                    variation={variation}
                                                />
                                            }
                                            footnote={
                                                unit.method === 'sum' && unit.seriesVariables < unit.totalVariables
                                                    ? `Serie sobre ${unit.seriesVariables} de ${unit.totalVariables} variables: las presentes en todos los períodos. Las demás quedan fuera para que un período sin relevar no dibuje una caída que no ocurrió; por eso el nivel puede no coincidir con el total de la comparación de dos períodos.`
                                                    : undefined
                                            }
                                            table={{
                                                columns: ['Período', 'Valor', 'Var. vs anterior'],
                                                rows: data.map((point, i) => {
                                                    const previous = i > 0 ? data[i - 1].value : null;
                                                    const change =
                                                        point.value !== null && previous !== null && previous !== 0
                                                            ? ((point.value - previous) / previous) * 100
                                                            : null;
                                                    return [
                                                        point.period,
                                                        point.value === null ? '—' : format(point.value),
                                                        formatPercent(change),
                                                    ];
                                                }),
                                            }}
                                        >
                                            <EvolutionLineChart
                                                data={data}
                                                formatValue={format}
                                                seriesLabel={`${methodLabel(unit)} (${unit.unitOfMeasure})`}
                                            />
                                        </ChartCard>
                                    );
                                })}
                            </div>

                            {history!.studyFields.length > 0 && (
                                <ChartCard
                                    title="Evolución por campo de estudio"
                                    description="Cada campo en su propia escala: lo comparable entre celdas es la forma de la serie, no la altura."
                                    table={{
                                        columns: ['Campo', ...periodNames],
                                        align: ['left', ...periodNames.map(() => 'right' as const)],
                                        rows: history!.studyFields.map(field => [
                                            field.name,
                                            ...field.values.map(value =>
                                                value === null
                                                    ? '—'
                                                    : formatMetric(value, field.unitOfMeasure, field.isCurrency),
                                            ),
                                        ]),
                                    }}
                                >
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        {history!.studyFields.map(field => (
                                            <SparkTile
                                                key={field.id}
                                                title={field.name}
                                                badge={field.unitOfMeasure}
                                                value={formatMetric(
                                                    lastObserved(field.values),
                                                    field.unitOfMeasure,
                                                    field.isCurrency,
                                                )}
                                                variation={latestVariation(field.values)}
                                                data={periodNames.map((period, i) => ({
                                                    period,
                                                    value: field.values[i],
                                                }))}
                                                formatValue={value =>
                                                    formatMetric(value, field.unitOfMeasure, field.isCurrency)
                                                }
                                            />
                                        ))}
                                    </div>
                                </ChartCard>
                            )}
                        </>
                    )}
                </section>

                {/* ---------------------------------------------------------------
                    Comparación del par elegido
                   --------------------------------------------------------------- */}
                <section className="space-y-4">
                    <div>
                        <h3 className="text-lg font-medium text-ink">
                            Qué se movió · {periodBLabel} → {periodALabel}
                        </h3>
                        <p className="text-xs text-muted mt-1">
                            Sobre el par de períodos elegido arriba. Rojo, subió; verde, bajó.
                        </p>
                    </div>

                    {!report ? (
                        <EmptyState
                            title="Sin análisis generado"
                            description="Elegí dos períodos cerrados en el selector de arriba."
                        />
                    ) : (
                        <>
                            {fieldVariationRows.length > 0 && (
                                <ChartCard
                                    title="Variación por campo de estudio"
                                    description="Variación del agregado de cada campo. Como es porcentual, campos de distinta unidad se pueden leer en el mismo eje."
                                    footnote={
                                        report.studyFieldAnalysis.length > fieldVariationRows.length
                                            ? `${report.studyFieldAnalysis.length - fieldVariationRows.length} campo(s) sin variación definida quedaron fuera: sin unidad declarada, sin variables numéricas, o sin datos en ambos períodos.`
                                            : undefined
                                    }
                                    table={{
                                        columns: ['Campo', 'Unidad', periodBLabel, periodALabel, 'Variación'],
                                        align: ['left', 'left', 'right', 'right', 'right'],
                                        rows: report.studyFieldAnalysis
                                            .filter(f => f.aggregate?.variation != null)
                                            .sort((a, b) => b.aggregate!.variation! - a.aggregate!.variation!)
                                            .map(field => [
                                                field.name,
                                                field.unitOfMeasure ?? '—',
                                                formatMetric(field.aggregate!.valueB, field.unitOfMeasure, field.aggregate!.isCurrency),
                                                formatMetric(field.aggregate!.valueA, field.unitOfMeasure, field.aggregate!.isCurrency),
                                                formatPercent(field.aggregate!.variation),
                                            ]),
                                    }}
                                >
                                    <DivergingBarChart
                                        rows={fieldVariationRows}
                                        formatValue={formatPercent}
                                        labelWidth={200}
                                    />
                                </ChartCard>
                            )}

                            {variableRanking.rows.length > 0 && (
                                <ChartCard
                                    title="Variables que más se movieron"
                                    description="Las de mayor variación en valor absoluto, hacia arriba o hacia abajo."
                                    footnote={
                                        variableRanking.total > RANKING_LIMIT
                                            ? `${RANKING_LIMIT} de ${variableRanking.total} variables con variación definida. El listado completo está en la pestaña Resumen.`
                                            : undefined
                                    }
                                    table={{
                                        columns: ['Variable', 'Variación'],
                                        rows: variableRanking.rows.map(row => [
                                            row.tooltipTitle ?? row.label,
                                            formatPercent(row.value),
                                        ]),
                                    }}
                                >
                                    <DivergingBarChart
                                        rows={variableRanking.rows}
                                        formatValue={formatPercent}
                                        labelWidth={220}
                                    />
                                </ChartCard>
                            )}

                            {incidenceByUnit.map(({ total, entries }) => {
                                const shown = entries.slice(0, INCIDENCE_LIMIT);
                                const folded = entries.slice(INCIDENCE_LIMIT);
                                const foldedIncidence = folded.reduce((sum, e) => sum + e.incidence, 0);

                                const rows: DivergingBarRow[] = shown.map(entry => ({
                                    key: entry.key,
                                    label: entry.variableName,
                                    value: entry.incidence,
                                    tooltipTitle: entry.variableName,
                                    tooltipRows: [
                                        { label: 'Campo', value: entry.fieldName },
                                        { label: 'Peso en la base', value: `${(entry.weight * 100).toFixed(1)}%` },
                                        { label: 'Variación propia', value: formatPercent(entry.variation) },
                                        { label: 'Incidencia', value: formatSignedPercent(entry.incidence) },
                                    ],
                                }));
                                if (folded.length > 0) {
                                    rows.push({
                                        key: '__resto__',
                                        label: `Resto (${folded.length})`,
                                        value: foldedIncidence,
                                        tooltipTitle: `Resto de las variables (${folded.length})`,
                                        tooltipRows: [
                                            { label: 'Incidencia conjunta', value: formatSignedPercent(foldedIncidence) },
                                        ],
                                    });
                                }
                                rows.sort((a, b) => b.value - a.value);

                                return (
                                    <ChartCard
                                        key={total.unitOfMeasure}
                                        title={`Incidencia en ${methodLabel(total).toLowerCase()} de ${total.unitOfMeasure}`}
                                        description="Cuántos puntos porcentuales de la variación del total puso cada variable: su variación propia pesada por lo que representa en la base. Las incidencias suman la variación del total."
                                        action={
                                            <SeriesHeadline
                                                value={formatMetric(total.valueA, total.unitOfMeasure, total.isCurrency)}
                                                variation={total.variation}
                                            />
                                        }
                                        footnote={`Sobre las ${entries.length} variable(s) con dato en ambos períodos. Total: ${formatSignedPercent(total.variation)}.`}
                                        table={{
                                            columns: ['Variable', 'Campo', 'Peso', 'Var. propia', 'Incidencia'],
                                            align: ['left', 'left', 'right', 'right', 'right'],
                                            rows: entries.map(entry => [
                                                entry.variableName,
                                                entry.fieldName,
                                                `${(entry.weight * 100).toFixed(1)}%`,
                                                formatPercent(entry.variation),
                                                formatSignedPercent(entry.incidence),
                                            ]),
                                        }}
                                    >
                                        <DivergingBarChart
                                            rows={rows}
                                            formatValue={formatSignedPercent}
                                            labelWidth={220}
                                        />
                                    </ChartCard>
                                );
                            })}
                        </>
                    )}
                </section>

                {/* ---------------------------------------------------------------
                    Cualitativas
                   --------------------------------------------------------------- */}
                {qualitativeOptions.length > 0 && (
                    <section className="space-y-4">
                        <div>
                            <h3 className="text-lg font-medium text-ink">Cualitativas</h3>
                            <p className="text-xs text-muted mt-1">
                                Cómo se repartieron las respuestas en cada período cerrado. Las de
                                texto libre no aparecen: no tienen distribución que agregar.
                            </p>
                        </div>

                        <ChartCard
                            title="Distribución por período"
                            description="Cada barra es un período al 100%. Lo que se lee es el cambio de reparto entre períodos, no el volumen de respuestas."
                            action={
                                <div className="w-64">
                                    <Select<VariableOption>
                                        inputId="charts-qualitative-variable"
                                        aria-label="Variable cualitativa"
                                        options={qualitativeOptions}
                                        value={qualitativeVariable}
                                        onChange={option => setQualitativeVariable(option)}
                                        styles={getReactSelectStyles<VariableOption>()}
                                    />
                                </div>
                            }
                            table={{
                                columns: ['Período', 'Categoría', 'Respuestas', 'Participación'],
                                align: ['left', 'left', 'right', 'right'],
                                rows: shares.rows.flatMap(row =>
                                    shares.categories.map(category => [
                                        row.period,
                                        category.label,
                                        String(row.counts[category.key] ?? 0),
                                        `${((row.shares[category.key] ?? 0) * 100).toFixed(1)}%`,
                                    ]),
                                ),
                            }}
                        >
                            <LoadingArea isLoading={isLoadingDistribution} skeleton={<ChartSkeleton height={200} />}>
                                {shares.rows.length === 0 ? (
                                    <p className="text-sm text-muted py-6 text-center">
                                        Esta variable no tiene respuestas cargadas en períodos cerrados.
                                    </p>
                                ) : (
                                    <SharesStackedChart categories={shares.categories} rows={shares.rows} />
                                )}
                            </LoadingArea>
                        </ChartCard>
                    </section>
                )}
            </div>
        </LoadingArea>
    );
};
