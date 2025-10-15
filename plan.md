# Plan de Mejoras del Proyecto: InflaciónApp

Este documento detalla un plan estructurado para mejorar la robustez, seguridad, mantenibilidad y calidad general del proyecto InflaciónApp, basado en un análisis profundo del código fuente.

---

## 1. Mejoras Críticas

### **Seguridad: Eliminar Riesgo de Inyección SQL en el Backend**

* **Problema**: La ruta `/api/save-draft` en `inflacion_app_backend/server.js` construye su consulta de inserción de datos mediante la concatenación de cadenas de texto. Este método es inseguro y expone a la aplicación a ataques de **inyección SQL**, donde un actor malicioso podría enviar datos diseñados para manipular la base de datos, robar información o incluso borrarla.

* **Acciones Detalladas**:
    1.  **Refactorizar la Consulta**: Modificar la lógica de la ruta `/api/save-draft` para que utilice **consultas parametrizadas** en lugar de concatenación de cadenas.
    2.  **Utilizar Transacciones**: Asegurarse de que el borrado de los borradores antiguos y la inserción de los nuevos ocurran dentro de una transacción de base de datos (`BEGIN`, `COMMIT`, `ROLLBACK`). Esto garantiza que la operación sea atómica: o se completan todos los pasos con éxito, o no se realiza ningún cambio.
    3.  **Validar y Sanitizar Entradas**: Aunque las consultas parametrizadas son la defensa principal, siempre se debe validar el tipo y formato de los datos recibidos en el backend (ej. `commerceId` debe ser un número) antes de pasarlos a la base de datos.

---

## 2. Mejoras de Arquitectura y Mantenibilidad

### **Backend: Modularización del Archivo `server.js`**

* **Problema**: El archivo `server.js` es monolítico. Contiene la configuración del servidor, la definición de todas las rutas de la API, la lógica de negocio de cada ruta (incluyendo las consultas a la base de datos) y los middlewares de autenticación. A medida que el proyecto crezca, este archivo se volverá extremadamente difícil de leer, depurar y mantener.

* **Acciones Detalladas**:
    1.  **Adoptar una Arquitectura de Capas**: Reestructurar el backend siguiendo un patrón como **Controlador-Servicio-Ruta**.
    2.  **Crear una Estructura de Carpetas**:
        * `src/routes/`: Cada archivo definirá un conjunto de rutas relacionadas (ej. `periods.routes.js`, `users.routes.js`).
        * `src/controllers/`: Cada archivo contendrá la lógica que se ejecuta para cada ruta (las funciones que reciben `req` y `res`).
        * `src/middlewares/`: Mover los middlewares como `authenticateToken` y `authorizeAdmin` a sus propios archivos.
        * `src/config/`: Centralizar la configuración de la base de datos y la carga de variables de entorno.
    3.  **Refactorizar el Código**:
        * Mover la lógica de cada endpoint de `server.js` a su función correspondiente en un archivo de controlador.
        * Mover la definición de las rutas (ej. `app.get('/api/periods', ...)`) a los archivos de rutas.
        * El archivo `server.js` final solo debe encargarse de inicializar `express`, aplicar middlewares globales, conectar los enrutadores y arrancar el servidor.

### **Frontend: Descomposición del Componente `AdminDashboard.jsx`**

* **Problema**: El componente `AdminDashboard.jsx` es un "mega-componente" que contiene la lógica y el JSX para múltiples vistas (Análisis, Períodos, Registros, Usuarios), además de todos sus sub-componentes (modales, tablas, tarjetas, etc.). Esto viola el principio de responsabilidad única, dificulta la reutilización de código y hace que el archivo sea muy difícil de navegar y modificar.

* **Acciones Detalladas**:
    1.  **Extraer las Vistas Principales**: Cada una de las vistas (`AnalysisView`, `PeriodsManager`, `PricesManager`, `UsersManager`) debe ser extraída a su propio archivo dentro de una nueva subcarpeta, por ejemplo: `src/components/admin/views/`.
    2.  **Extraer Componentes de UI Reutilizables**: Componentes como `StatCard`, `Modal`, `ConfirmModal`, `Pagination`, `Breadcrumbs`, y `Tooltip` deben ser extraídos a sus propios archivos, idealmente en una carpeta como `src/components/admin/ui/` o `src/components/common/`.
    3.  **Crear un Componente de Layout**: Crear un componente `AdminLayout.jsx` que contenga la estructura principal del dashboard (el `sidebar` y el contenedor de contenido). Este layout recibirá la vista actual como `children`.
    4.  **Simplificar `AdminDashboard.jsx`**: El archivo `AdminDashboard.jsx` refactorizado solo debe gestionar el estado de la vista activa (qué menú está seleccionado) y renderizar el `AdminLayout` con el componente de la vista correspondiente. Su responsabilidad se reduce a ser un "orquestador" de vistas.

---

## 3. Mejoras de Calidad y Robustez

### **Calidad del Código: Implementar Pruebas Automatizadas**

* **Problema**: El proyecto carece por completo de un _suite_ de pruebas. Esto significa que no hay una forma automática de verificar que el código funciona como se espera. Cada cambio manual o nueva funcionalidad introduce el riesgo de romper funcionalidades existentes sin darse cuenta (`regresiones`).

* **Acciones Detalladas**:
    1.  **Configurar Frameworks de Pruebas**:
        * **Backend**: Integrar **Jest** como corredor de pruebas y **Supertest** para realizar peticiones HTTP a la API en un entorno de prueba.
        * **Frontend**: Integrar **Jest** con **React Testing Library** para probar componentes de React de una manera que simule la interacción del usuario.
    2.  **Crear una Estrategia de Pruebas**:
        * **Backend**: Empezar creando pruebas de integración para los endpoints más críticos (login, envío de precios, obtención de datos del dashboard).
        * **Frontend**: Crear pruebas unitarias para componentes de UI puros (ej. ¿el `RoleTag` muestra el color correcto para cada rol?) y pruebas de interacción para flujos complejos (ej. simular el llenado de un precio en `RegistrationWizard` y verificar que el estado se actualice).

### **Frontend: Optimizar la Obtención de Datos (Data Fetching)**

* **Problema**: La lógica para obtener datos del servidor está implementada manualmente con `fetch` dentro de `useEffect`, y los estados de `isLoading`, `error` y `data` se manejan con múltiples `useState`. Este patrón se repite en varios componentes, generando código repetitivo y siendo propenso a errores.

* **Acciones Detalladas**:
    1.  **Integrar una Librería de Gestión de Estado del Servidor**: Adoptar una librería como **React Query (TanStack Query)** o **SWR**.
    2.  **Refactorizar Componentes**: Reemplazar la lógica de `useEffect` y los múltiples `useState` con los hooks que provee la librería (ej. `useQuery`).
    3.  **Beneficios a Obtener**:
        * **Reducción de Código**: Simplificar drásticamente los componentes que obtienen datos.
        * **Cacheo Automático**: Evitar volver a pedir datos que ya se tienen, mejorando el rendimiento y la experiencia de usuario.
        * **Revalidación en Segundo Plano**: Mantener los datos de la aplicación actualizados sin que el usuario tenga que recargar la página.
        * **Mejor Gestión de Errores y Estados de Carga**: La librería proporciona estados claros y robustos (`isLoading`, `isError`, `isSuccess`, etc.) de forma nativa.

---

## 4. Mejoras en la Experiencia de Desarrollo

### **Configuración del Proyecto**

* **Problema**: Faltan archivos de configuración que estandaricen el entorno para nuevos desarrolladores y hay una incorrecta clasificación de dependencias.
* **Acciones Detalladas**:
    1.  **Crear `.env.example` en el Backend**: Añadir un archivo `inflacion_app_backend/.env.example` que liste todas las variables de entorno necesarias para ejecutar el backend (ej. `DB_USER`, `JWT_SECRET`), pero sin sus valores.
    2.  **Corregir `package.json` del Frontend**: En `inflacion_app_frontend/package.json`, mover paquetes que solo se usan en desarrollo (`vite`, `eslint`, `tailwindcss`, `@vitejs/plugin-react`, etc.) de la sección `dependencies` a `devDependencies`.

### **Manejo de Errores en el Backend**

* **Problema**: El backend a menudo devuelve mensajes de error genéricos ("Error interno del servidor"), lo que dificulta la depuración desde el frontend.
* **Acciones Detalladas**:
    1.  **Implementar un Middleware de Errores**: Crear un middleware global en Express que capture todos los errores.
    2.  **Proporcionar Mensajes de Error Específicos**: Cuando sea seguro hacerlo, enviar mensajes más descriptivos al cliente. Por ejemplo, en lugar de un 500 genérico, un error 404 con el mensaje "El período con ID 123 no fue encontrado".
    3.  **Logging Mejorado**: Registrar en la consola del servidor (o en un archivo de logs) el error completo, con su `stack trace`, para facilitar la depuración, mientras se envía un mensaje más amigable al cliente.