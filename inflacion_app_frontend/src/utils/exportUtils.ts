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
 * Formatea un precio en guaraníes
 */
export const formatPrice = (price: number | string | null | undefined) => {
    if (price === null || price === undefined) return '';
    return new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: 'PYG',
        minimumFractionDigits: 0
    }).format(Number(price));
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
