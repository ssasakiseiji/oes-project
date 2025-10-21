# Guía de Despliegue - InflaciónApp

## Resumen
- **Frontend**: Vercel
- **Backend**: Render
- **Base de Datos**: Supabase (PostgreSQL)

---

## 1. Preparar Base de Datos en Supabase

### Paso 1: Crear Proyecto en Supabase
1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Clic en "New Project"
4. Configura:
   - **Name**: inflacion-app
   - **Database Password**: (guarda esta contraseña)
   - **Region**: Selecciona la más cercana
   - **Pricing Plan**: Free tier

### Paso 2: Ejecutar SQL de Inicialización
1. En el dashboard de Supabase, ve a **SQL Editor**
2. Ejecuta el contenido del archivo `inflacion_app_backend/seed.sql`
3. Verifica que todas las tablas se crearon correctamente

### Paso 3: Obtener Credenciales de Conexión
1. Ve a **Settings** → **Database**
2. Busca la sección **Connection String**
3. Selecciona el modo "Session"
4. Copia la connection string, se verá así:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```
5. Extrae los valores:
   - **DB_USER**: `postgres`
   - **DB_HOST**: `aws-0-[REGION].pooler.supabase.com`
   - **DB_DATABASE**: `postgres`
   - **DB_PASSWORD**: (la contraseña que guardaste)
   - **DB_PORT**: `5432`

---

## 2. Desplegar Backend en Render

### Paso 1: Preparar Repositorio
1. Asegúrate de que tu código esté en GitHub
2. Commit y push todos los cambios:
   ```bash
   git add .
   git commit -m "Preparar para despliegue"
   git push origin main
   ```

### Paso 2: Crear Web Service en Render
1. Ve a [https://render.com](https://render.com)
2. Crea una cuenta o inicia sesión
3. Clic en "New +" → "Web Service"
4. Conecta tu repositorio de GitHub
5. Configura el servicio:
   - **Name**: `inflacion-app-backend`
   - **Region**: Selecciona la más cercana
   - **Branch**: `main`
   - **Root Directory**: `inflacion_app_backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### Paso 3: Configurar Variables de Entorno
En la sección "Environment Variables", agrega:

```
NODE_ENV=production
PORT=10000
DB_USER=postgres
DB_HOST=[TU_HOST_DE_SUPABASE]
DB_DATABASE=postgres
DB_PASSWORD=[TU_PASSWORD_DE_SUPABASE]
DB_PORT=5432
JWT_SECRET=[GENERA_UNA_CLAVE_SEGURA]
```

Para generar JWT_SECRET, usa:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Paso 4: Desplegar
1. Clic en "Create Web Service"
2. Espera a que termine el despliegue (5-10 minutos)
3. Guarda la URL del backend (ej: `https://inflacion-app-backend.onrender.com`)

---

## 3. Desplegar Frontend en Vercel

### Paso 1: Actualizar URL del Backend
1. Abre `inflacion_app_frontend/src/api.js`
2. Actualiza la `BASE_URL`:
   ```javascript
   const BASE_URL = import.meta.env.VITE_API_URL || 'https://inflacion-app-backend.onrender.com';
   ```

### Paso 2: Crear archivo de configuración
Crea `inflacion_app_frontend/vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

### Paso 3: Desplegar en Vercel
1. Ve a [https://vercel.com](https://vercel.com)
2. Crea una cuenta o inicia sesión con GitHub
3. Clic en "Add New..." → "Project"
4. Importa tu repositorio
5. Configura el proyecto:
   - **Framework Preset**: Vite
   - **Root Directory**: `inflacion_app_frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Paso 4: Configurar Variables de Entorno
En la sección "Environment Variables":
```
VITE_API_URL=https://inflacion-app-backend.onrender.com
```

### Paso 5: Desplegar
1. Clic en "Deploy"
2. Espera a que termine (2-5 minutos)
3. Guarda la URL del frontend (ej: `https://inflacion-app.vercel.app`)

---

## 4. Configurar CORS en el Backend

### Actualizar allowed origins
1. Ve a tu código en `inflacion_app_backend/server.js`
2. Actualiza la configuración de CORS:
   ```javascript
   const corsOptions = {
     origin: [
       'http://localhost:5173',
       'https://inflacion-app.vercel.app', // Tu dominio de Vercel
       'https://tu-dominio-custom.com' // Si tienes dominio personalizado
     ],
     credentials: true
   };
   ```
3. Commit y push:
   ```bash
   git add .
   git commit -m "Actualizar CORS para producción"
   git push
   ```
4. Render automáticamente redesplegará el backend

---

## 5. Verificación Final

### Checklist de Testing:
- [ ] El frontend carga correctamente
- [ ] Puedes iniciar sesión
- [ ] Los roles se cambian correctamente
- [ ] Panel de Admin funciona
- [ ] Panel de Monitor funciona
- [ ] Panel de Estudiante funciona
- [ ] Se pueden crear períodos
- [ ] Se pueden asignar comercios
- [ ] Se pueden registrar precios
- [ ] El modo oscuro funciona
- [ ] La aplicación es responsive en móvil

### URLs de Referencia:
- **Frontend**: https://[TU-APP].vercel.app
- **Backend**: https://[TU-APP].onrender.com
- **Base de Datos**: Supabase Dashboard

---

## Notas Importantes

### Limitaciones del Free Tier:

**Supabase Free:**
- 500 MB de almacenamiento
- 2 GB de transferencia mensual
- Pausa después de 7 días de inactividad

**Render Free:**
- El servicio se "duerme" después de 15 minutos de inactividad
- Primera request puede tardar 30-60 segundos
- 750 horas gratis al mes

**Vercel Free:**
- 100 GB de bandwidth
- Deploy automático en cada push

### Recomendaciones:
1. Monitorea el uso en cada plataforma
2. Configura alertas de límites
3. Considera upgrade si la app crece
4. Mantén backups regulares de la base de datos

---

## Troubleshooting

### Backend no conecta a la base de datos:
- Verifica las credenciales en Render
- Revisa que el host de Supabase sea correcto
- Chequea los logs en Render Dashboard

### Frontend no se conecta al backend:
- Verifica la variable VITE_API_URL en Vercel
- Chequea que CORS esté configurado correctamente
- Revisa la consola del navegador para errores

### El backend se "duerme":
- Es normal en el free tier de Render
- Primera request toma ~30-60 segundos
- Considera usar un servicio de "keep-alive" o upgrade a plan pago

---

## Soporte

Para más información:
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Render](https://render.com/docs)
- [Documentación de Vercel](https://vercel.com/docs)
