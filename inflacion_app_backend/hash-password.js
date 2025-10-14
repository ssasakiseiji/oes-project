import bcrypt from 'bcrypt';
const saltRounds = 10;
const password = 'password123'; // La contraseña de nuestros usuarios de prueba

bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
        console.error("Error al generar el hash:", err);
        return;
    }
    console.log("Copia esta línea completa. Este es tu hash:");
    console.log(hash);
});