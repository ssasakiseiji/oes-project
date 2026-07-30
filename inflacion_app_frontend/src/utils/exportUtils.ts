/**
 * Utilidades para exportar datos a diferentes formatos
 */

import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

export interface ExportHeader<T> {
    key: keyof T;
    label: string;
}

type CellValue = string | number | boolean | Date | null | undefined;

/**
 * Exporta datos a formato CSV
 */
export const exportToCSV = <T extends object>(
    data: T[],
    filename: string,
    headers: ExportHeader<T>[],
) => {
    if (!data || data.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    // Crear headers
    const headerRow = headers.map(h => h.label).join(',');

    // Crear filas de datos
    const dataRows = data.map(row => {
        return headers.map(h => {
            const value = row[h.key] as CellValue;
            let cell: string;

            // Manejar diferentes tipos de datos
            if (value === null || value === undefined) {
                cell = '';
            } else if (typeof value === 'string') {
                // Escapar comillas y envolver en comillas si contiene comas o saltos de línea
                cell = value.includes(',') || value.includes('"') || value.includes('\n')
                    ? `"${value.replace(/"/g, '""')}"`
                    : value;
            } else if (value instanceof Date) {
                cell = value.toLocaleDateString('es-PY');
            } else {
                cell = String(value);
            }

            return cell;
        }).join(',');
    }).join('\n');

    // Combinar header y data
    const csv = `${headerRow}\n${dataRows}`;

    // Crear blob con BOM para soporte UTF-8 en Excel
    const BOM = '﻿';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });

    // Agregar timestamp al filename
    const timestamp = new Date().toISOString().slice(0, 10);
    saveAs(blob, `${filename}_${timestamp}.csv`);
};

const toExcelRow = <T extends object>(row: T, headers: ExportHeader<T>[]) => {
    const newRow: Record<string, CellValue> = {};
    headers.forEach(h => {
        let value = row[h.key] as CellValue;

        // Formatear valores según tipo
        if (value instanceof Date) {
            value = value.toLocaleDateString('es-PY');
        } else if (value === null || value === undefined) {
            value = '';
        }

        newRow[h.label] = value;
    });
    return newRow;
};

const computeColumnWidths = <T extends object>(data: T[], headers: ExportHeader<T>[]) =>
    headers.map(h => {
        const maxLength = Math.max(
            h.label.length,
            ...data.map(row => {
                const value = row[h.key];
                return value !== null && value !== undefined ? String(value).length : 0;
            })
        );
        return { wch: Math.min(maxLength + 2, 50) }; // Max 50 caracteres de ancho
    });

/**
 * Exporta datos a formato Excel
 */
export const exportToExcel = <T extends object>(
    data: T[],
    filename: string,
    headers: ExportHeader<T>[],
    sheetName = 'Datos',
) => {
    if (!data || data.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    // Preparar datos para Excel
    const excelData = data.map(row => toExcelRow(row, headers));

    // Crear workbook y worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Ajustar ancho de columnas automáticamente
    worksheet['!cols'] = computeColumnWidths(data, headers);

    // Exportar
    const timestamp = new Date().toISOString().slice(0, 10);
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}_${timestamp}.xlsx`);
};

export interface ExportDataset<T extends object> {
    data: T[];
    headers: ExportHeader<T>[];
    sheetName: string;
}

/**
 * Exporta múltiples conjuntos de datos a diferentes hojas de Excel
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exportMultipleSheetsToExcel = (datasets: ExportDataset<any>[], filename: string) => {
    if (!datasets || datasets.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const workbook = XLSX.utils.book_new();

    datasets.forEach(({ data, headers, sheetName }) => {
        if (!data || data.length === 0) return;

        // Preparar datos
        const excelData = data.map(row => toExcelRow(row, headers));

        // Crear worksheet
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // Ajustar anchos
        worksheet['!cols'] = computeColumnWidths(data, headers);

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // Exportar
    const timestamp = new Date().toISOString().slice(0, 10);
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}_${timestamp}.xlsx`);
};

/**
 * Formatea un monto en guaraníes
 */
export const formatCurrency = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return '';
    return new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: 'PYG',
        minimumFractionDigits: 0
    }).format(Number(value));
};

/**
 * Formatea el valor de una observación según el dataType/config de su
 * variable -- reemplaza el formatPrice() de antes del rename (Fase K),
 * que asumía que todo valor era un precio en guaraníes.
 */
export const formatObservationValue = (row: {
    dataType: string;
    isCurrency: boolean;
    numericValue: number | string | null;
    textValue: string | null;
    booleanValue: boolean | null;
    choiceValue: string | null;
}): string => {
    switch (row.dataType) {
        case 'numeric':
            if (row.numericValue === null) return '';
            return row.isCurrency
                ? formatCurrency(row.numericValue)
                : new Intl.NumberFormat('es-PY').format(Number(row.numericValue));
        case 'boolean':
            return row.booleanValue === null ? '' : (row.booleanValue ? 'Sí' : 'No');
        case 'categorical':
            return row.choiceValue ?? '';
        case 'text':
            return row.textValue ?? '';
        default:
            return '';
    }
};

/**
 * Etiqueta legible para un valor dentro de una distribución de frecuencias
 * (Fase AA). El backend emite las booleanas como 'true'/'false' -- es lo que
 * Postgres serializa, y tanto /api/variable-distribution como /api/analysis lo
 * devuelven así -- pero mostrarlas crudas contradice el 'Sí'/'No' que
 * formatObservationValue ya usa en Registros. La traducción es presentación,
 * así que vive acá y la comparten ambas vistas.
 */
export const formatQualitativeValue = (value: string, dataType: string): string => {
    if (dataType !== 'boolean') return value;
    if (value === 'true') return 'Sí';
    if (value === 'false') return 'No';
    return value;
};

/**
 * Formatea una métrica agregada (promedio/canasta) según su unidad. Las
 * monetarias van con el formato de moneda completo; el resto, número + unidad
 * del campo de estudio. `null` es "indefinido" (sin datos o base cero), y se
 * muestra como "—" en vez de un 0 que se leería como un dato real.
 */
export const formatMetric = (
    value: number | null,
    unitOfMeasure: string | null,
    isCurrency: boolean
): string => {
    if (value === null) return '—';
    if (isCurrency) return formatCurrency(value);
    const formatted = new Intl.NumberFormat('es-PY', { maximumFractionDigits: 2 }).format(value);
    return unitOfMeasure ? `${formatted} ${unitOfMeasure}` : formatted;
};

/**
 * Formatea una fecha
 */
export const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-PY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};
