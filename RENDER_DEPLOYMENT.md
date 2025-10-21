# 🚀 Guía Rápida de Despliegue en Render

## Variables de Entorno Generadas

**JWT_SECRET (copialo):**
```
50dd8780d859c4b987641b91ca6b47e0f062dd667289911c8cc42fe3676729bea75d6736fd959e4d51f634ffab135aa56272f945da9dc6e0772268b088ad8b99
```

---

## Paso a Paso para Render

### 1. Preparar el Código
```bash
git add .
git commit -m "Configurar backend para Render"
git push origin main
```

### 2. Crear Web Service en Render

1. Ve a [https://render.com](https://render.com)
2. Crea una cuenta o inicia sesión
3. Click en **"New +"** → **"Web Service"**
4. Conecta tu repositorio de GitHub
5. Selecciona el repositorio `oes-project`

### 3. Configuración del Servicio

**Configuración Básica:**
- **Name:** `inflacion-app-backend` (o el nombre que prefieras)
- **Region:** `Oregon` (o la más cercana)
- **Branch:** `main`
- **Root Directory:** `inflacion_app_backend` ⚠️ **IMPORTANTE**
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Instance Type:** `Free`

### 4. Variables de Entorno

Agrega estas variables en la sección **"Environment Variables"**:

```env
NODE_ENV=production
PORT=10000
DB_USER=postgres
DB_HOST=TU_HOST_DE_SUPABASE
DB_DATABASE=postgres
DB_PASSWORD=TU_PASSWORD_DE_SUPABASE
DB_PORT=5432
JWT_SECRET=50dd8780d859c4b987641b91ca6b47e0f062dd667289911c8cc42fe3676729bea75d6736fd959e4d51f634ffab135aa56272f945da9dc6e0772268b088ad8b99
FRONTEND_URL=TU_URL_DE_VERCEL
```

**Donde obtener las credenciales de Supabase:**

1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. **Settings** → **Database**
3. En **Connection String**, selecciona modo **"Session"**
4. Copia la connection string, se verá así:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```
5. Extrae:
   - `DB_HOST`: `aws-0-[REGION].pooler.supabase.com`
   - `DB_PASSWORD`: (la contraseña que estableciste)

**FRONTEND_URL:**
- Déjalo vacío por ahora
- Después de desplegar el frontend en Vercel, actualiza con: `https://tu-app.vercel.app`

### 5. Desplegar

1. Click en **"Create Web Service"**
2. Render comenzará el despliegue (5-10 minutos)
3. Observa los logs para verificar que no hay errores
4. Una vez completado, verás tu URL: `https://inflacion-app-backend.onrender.com`

### 6. Verificar el Despliegue

Abre la URL en tu navegador. Deberías ver:
```
🚀 Backend de InflaciónApp está en línea y conectado a PostgreSQL!
```

### 7. Actualizar FRONTEND_URL

1. Ve a Render Dashboard → tu servicio
2. **Environment** → Edita `FRONTEND_URL`
3. Agrega tu URL de Vercel (ej: `https://inflacion-app.vercel.app`)
4. Click en **"Save Changes"**
5. El servicio se redesplegará automáticamente

---

## Checklist de Verificación

- [ ] Repositorio en GitHub está actualizado
- [ ] Variables de entorno configuradas en Render
- [ ] Credenciales de Supabase son correctas
- [ ] Despliegue completado sin errores
- [ ] URL del backend es accesible
- [ ] FRONTEND_URL actualizada después de desplegar frontend

---

## Comandos Útiles

**Probar endpoint de salud:**
```bash
curl https://TU-BACKEND.onrender.com/
```

**Ver logs en tiempo real:**
- Ve a Render Dashboard → tu servicio → **Logs**

**Redesplegar manualmente:**
- Dashboard → **Manual Deploy** → **Deploy latest commit**

---

## Troubleshooting

### Error: "Failed to connect to database"
- Verifica las credenciales de Supabase
- Asegúrate de usar el host correcto (`.pooler.supabase.com`)
- Revisa que el password no tenga caracteres especiales sin escapar

### Error: "Build failed"
- Verifica que `Root Directory` sea exactamente: `inflacion_app_backend`
- Revisa los logs de build para errores específicos

### El servicio se "duerme"
- Es normal en el plan Free
- Primera request después de inactividad toma 30-60 segundos
- Considera usar un servicio de ping o upgrade a plan pago

---

## Próximos Pasos

1. ✅ Backend desplegado en Render
2. ⏭️ Desplegar Frontend en Vercel (ver [DEPLOYMENT.md](DEPLOYMENT.md))
3. ⏭️ Actualizar FRONTEND_URL en Render
4. ⏭️ Probar la aplicación completa

---

## Notas Importantes

- **Plan Free de Render:** 750 horas/mes, servicio se duerme después de 15 min de inactividad
- **Redespliegue automático:** Cada push a `main` redespliega el servicio
- **SSL/HTTPS:** Incluido automáticamente
- **Logs:** Disponibles por 7 días en plan Free

¡Listo! Tu backend debería estar funcionando en Render. 🎉
