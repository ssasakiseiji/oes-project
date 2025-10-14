/**
 * Utilidades para exportar datos a diferentes formatos
 */

import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

/**
 * Exporta datos a formato CSV
 * @param {Array} data - Array de objetos con los datos
 * @param {string} filename - Nombre del archivo sin extensión
 * @param {Array} headers - Array de objetos {key: string, label: string} para las columnas
 */
export const exportToCSV = (data, filename, headers) => {
    if (!data || data.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    // Crear headers
    const headerRow = headers.map(h => h.label).join(',');

    // Crear filas de datos
    const dataRows = data.map(row => {
        return headers.map(h => {
            let value = row[h.key];

            // Manejar diferentes tipos de datos
            if (value === null || value === undefined) {
                value = '';
            } else if (typeof value === 'string') {
                // Escapar comillas y envolver en comillas si contiene comas o saltos de línea
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
            } else if (value instanceof Date) {
                value = value.toLocaleDateString('es-PY');
            } else if (typeof value === 'number') {
                value = value.toString();
            }

            return value;
        }).join(',');
    }).join('\n');

    // Combinar header y data
    const csv = `${headerRow}\n${dataRows}`;

    // Crear blob con BOM para soporte UTF-8 en Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });

    // Agregar timestamp al filename
    const timestamp = new Date().toISOString().slice(0, 10);
    saveAs(blob, `${filename}_${timestamp}.csv`);
};

/**
 * Exporta datos a formato Excel
 * @param {Array} data - Array de objetos con los datos
 * @param {string} filename - Nombre del archivo sin extensión
 * @param {Array} headers - Array de objetos {key: string, label: string} para las columnas
 * @param {string} sheetName - Nombre de la hoja (opcional)
 */
export const exportToExcel = (data, filename, headers, sheetName = 'Datos') => {
    if (!data || data.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    // Preparar datos para Excel
    const excelData = data.map(row => {
        const newRow = {};
        headers.forEach(h => {
            let value = row[h.key];

            // Formatear valores según tipo
            if (value instanceof Date) {
                value = value.toLocaleDateString('es-PY');
            } else if (value === null || value === undefined) {
                value = '';
            }

            newRow[h.label] = value;
        });
        return newRow;
    });

    // Crear workbook y worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Ajustar ancho de columnas automáticamente
    const maxWidth = headers.map(h => {
        const maxLength = Math.max(
            h.label.length,
            ...data.map(row => {
                const value = row[h.key];
                return value ? value.toString().length : 0;
            })
        );
        return { wch: Math.min(maxLength + 2, 50) }; // Max 50 caracteres de ancho
    });
    worksheet['!cols'] = maxWidth;

    // Exportar
    const timestamp = new Date().toISOString().slice(0, 10);
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}_${timestamp}.xlsx`);
};

/**
 * Exporta múltiples conjuntos de datos a diferentes hojas de Excel
 * @param {Array} datasets - Array de objetos {data, headers, sheetName}
 * @param {string} filename - Nombre del archivo sin extensión
 */
export const exportMultipleSheetsToExcel = (datasets, filename) => {
    if (!datasets || datasets.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const workbook = XLSX.utils.book_new();

    datasets.forEach(({ data, headers, sheetName }) => {
        if (!data || data.length === 0) return;

        // Preparar datos
        const excelData = data.map(row => {
            const newRow = {};
            headers.forEach(h => {
                let value = row[h.key];
                if (value instanceof Date) {
                    value = value.toLocaleDateString('es-PY');
                } else if (value === null || value === undefined) {
                    value = '';
                }
                newRow[h.label] = value;
            });
            return newRow;
        });

        // Crear worksheet
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // Ajustar anchos
        const maxWidth = headers.map(h => {
            const maxLength = Math.max(
                h.label.length,
                ...data.map(row => {
                    const value = row[h.key];
                    return value ? value.toString().length : 0;
                })
            );
            return { wch: Math.min(maxLength + 2, 50) };
        });
        worksheet['!cols'] = maxWidth;

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
 * @param {number} price - Precio a formatear
 * @returns {string} - Precio formateado
 */
export const formatPrice = (price) => {
    if (price === null || price === undefined) return '';
    return new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: 'PYG',
        minimumFractionDigits: 0
    }).format(price);
};

/**
 * Formatea una fecha
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
export const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-PY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};
