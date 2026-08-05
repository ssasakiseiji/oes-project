/*
 * Tokens y formatos compartidos por los gráficos (Fase AE).
 *
 * Nocturne es acromático a propósito (ver la cabecera de nocturne.css): el
 * único par cromático del sistema es success/danger, y encodea SIGNIFICADO
 * (subió/bajó), no identidad de marca. Eso decide cómo se colorea acá:
 *
 *  - Serie única (evolución de un total, un campo): un solo tono, el acento.
 *    Nada de repartir hues entre series que no compiten entre sí.
 *  - Polaridad (variación, incidencia): danger arriba / success abajo, con un
 *    gris neutro en el cero. Son los mismos colores con que la app ya escribe
 *    las variaciones en texto (ver variationClass), así que la barra y el
 *    número dicen lo mismo.
 *  - Identidad entre categorías de una cualitativa: rampa ordinal de un solo
 *    tono por lightness. Validada con el script de la skill de dataviz
 *    (validate_palette.js --ordinal --mode dark --surface "#1a1a1a"):
 *    monotonía OK, ΔL >= 0.06 en cada paso, extremo oscuro 2.23:1 contra la
 *    superficie, un solo hue. Cinco pasos es el techo: un sexto más oscuro no
 *    llega al mínimo de contraste, así que la cola se pliega en "Otros" en vez
 *    de inventar un paso más. El primer paso no arranca en el blanco del
 *    acento: en tema oscuro, una categoría con el 100% pinta una barra entera
 *    y a esa altura de lightness el bloque grita.
 *
 * Los colores van como var(--...) y no como hex: los tokens ya viven en el CSS
 * y duplicarlos acá sería una segunda fuente de verdad que se desincroniza.
 * La rampa ordinal sí va en hex porque no existe como token (y porque el par
 * paso/color-de-texto tiene que quedar junto para que se lea el contraste).
 */

export const CHART_COLORS = {
    /** Serie única / slot 1. */
    series: 'var(--color-accent)',
    /** Serie de contexto cuando hay una destacada. */
    muted: 'var(--color-accent-700)',
    /** Polaridad. */
    up: 'var(--color-danger)',
    down: 'var(--color-success)',
    /** Cero, ejes y grilla: hairlines que no compiten con los datos. */
    baseline: 'var(--color-nc-neutral-600)',
    grid: 'var(--color-divider)',
    /** Hueco entre marcas apiladas: se pinta del color de la superficie. */
    surface: 'var(--color-surface)',
} as const;

/** Color de una marca según el signo de lo que representa. */
export const polarityColor = (value: number) =>
    value >= 0 ? CHART_COLORS.up : CHART_COLORS.down;

export const ORDINAL_RAMP = ['#e0e0e0', '#b0b0b0', '#909090', '#6f6f6f', '#525252'];

/**
 * Tinta legible sobre cada paso de la rampa. Los cuatro primeros son claros y
 * llevan el fondo de la app; el último es oscuro y lleva el acento.
 */
export const ORDINAL_RAMP_INK = [
    'var(--color-bg)',
    'var(--color-bg)',
    'var(--color-bg)',
    'var(--color-bg)',
    'var(--color-accent-100)',
];

export const ORDINAL_RAMP_SIZE = ORDINAL_RAMP.length;

export const AXIS_TICK = {
    fill: 'color-mix(in srgb, var(--color-ink) 55%, transparent)',
    fontSize: 11,
} as const;

/** Ejes y grilla: línea sólida de un tono, nunca punteada. */
export const AXIS_LINE = { stroke: CHART_COLORS.grid } as const;

const plainFormatter = new Intl.NumberFormat('es-PY', {
    maximumFractionDigits: 2,
});

const axisFormatter = new Intl.NumberFormat('es-PY', {
    maximumFractionDigits: 1,
});

/*
 * Para ticks de eje, donde el espacio es poco y el orden de magnitud alcanza.
 *
 * Escalado a mano en vez de `notation: 'compact'` porque los datos de ICU para
 * es-PY no son consistentes en la caja del sufijo: 3.500 sale "3,5 K" y 10.500
 * sale "10,5 k". Sobre el mismo eje eso se lee como dos unidades distintas.
 */
export const formatCompact = (value: number) => {
    const magnitude = Math.abs(value);
    if (magnitude >= 1_000_000) return `${axisFormatter.format(value / 1_000_000)} M`;
    if (magnitude >= 1_000) return `${axisFormatter.format(value / 1_000)} k`;
    return axisFormatter.format(value);
};

export const formatNumber = (value: number) => plainFormatter.format(value);

/** Mismo formato que el resto del análisis: dos decimales y signo por color. */
export const formatPercent = (value: number | null) =>
    value === null ? '—' : `${value.toFixed(2)}%`;

/** Con signo explícito: para incidencias, donde el "+" es parte del dato. */
export const formatSignedPercent = (value: number | null) =>
    value === null ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

export const formatShare = (share: number) => `${(share * 100).toFixed(1)}%`;
