import crypto from 'crypto';

/**
 * Genera una contraseña aleatoria segura
 * @param {number} length - Longitud de la contraseña (por defecto 16)
 * @returns {string} Contraseña generada
 */
export function generateSecurePassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
        password += charset[randomBytes[i] % charset.length];
    }

    return password;
}

// Si se ejecuta directamente desde la línea de comandos
if (import.meta.url === `file://${process.argv[1]}`) {
    const length = process.argv[2] ? parseInt(process.argv[2]) : 16;
    console.log('Contraseña generada:', generateSecurePassword(length));
}
