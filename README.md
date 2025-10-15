# Proyecto: Sistema de Recolección y Administración de Datos de Precios de Productos de la Canasta Básica para Análisis de Inflación Local.

## Descripción

Este proyecto es una aplicación web diseñada para automatizar la recolección, procesamiento, análisis y visualización de los precios de la canasta básica. Sirve como la herramienta principal para el proyecto de investigación del Índice de Precios al Consumidor (IPC) del Departamento de Itapúa, desarrollado para el Observatorio Económico y Social de la Facultad de Ciencias Económicas y Administrativas.

El sistema reemplaza el proceso manual anterior de uso de formularios de Google y hojas de cálculo, el cual era propenso a errores y demoras. Con esta nueva herramienta, se centraliza la recolección de datos, se automatizan los cálculos estadísticos y se proporcionan herramientas de visualización en tiempo real, transformando una tarea manual en un proceso digital eficiente y preciso.

## Tabla de Contenidos

- [Objetivo General](#objetivo-general)
- [Características](#características)
- [Stack Tecnológico](#stack-tecnológico)
- [Flujo de Trabajo](#flujo-de-trabajo)

## Objetivo General

Desarrollar una aplicación web robusta, segura y escalable para automatizar la recolección, procesamiento, análisis y visualización de los precios de la canasta básica, sirviendo como herramienta principal para el proyecto de investigación del IPC del Departamento de Itapúa.

## Características

### Roles de Usuario con Permisos
El sistema cuenta con un acceso seguro y diferentes niveles de permisos para proteger la integridad de los datos.
* **Estudiante**: Carga los datos de precios desde sus dispositivos móviles a través de una interfaz moderna e intuitiva.
* **Monitor**: Supervisa el estado de la recolección de datos en tiempo real a través de un panel de control.
* **Administrador**: Gestiona toda la información del sistema, incluyendo usuarios, productos, comercios y períodos de recolección.

### Módulos Principales
* **Registro de Precios**: Una interfaz dinámica optimizada para que los estudiantes puedan cargar datos fácilmente desde sus teléfonos móviles.
* **Panel de Supervisión**: Permite a los monitores verificar el estado de la recolección de datos en tiempo real.
* **Centro de Control del Administrador**: Para la gestión completa de datos, usuarios, productos, comercios y períodos de recolección.
* **Análisis Automático y Reporte Estadístico**: Genera reportes y gráficos sobre la variación de precios, eliminando la necesidad de cálculos manuales.
* **Base de Datos Centralizada**: Almacena de forma segura y permanente toda la información recopilada.

## Stack Tecnológico
### JavaScript
    - Node.js
    - React.js
    - Nest.js
    - PostgreSQL

## Flujo de Trabajo

1.  **Inicio del Período**: Un administrador inicia un nuevo período de recolección (ej. "Octubre 2025"), activando las tareas para los estudiantes.
2.  **Recolección de Datos**:
    * El estudiante inicia sesión y ve los comercios que tiene asignados.
    * Selecciona un comercio y utiliza un asistente para ingresar los precios de cada producto. La interfaz está optimizada para su uso en teléfonos móviles.
    * El estudiante puede guardar su progreso. Una vez enviado, los datos quedan bloqueados y solo pueden ser modificados por el administrador.
3.  **Supervisión**: Un monitor puede ver un panel que muestra el progreso de cada estudiante y qué comercios han sido completados.
4.  **Análisis y Gestión**: El administrador tiene acceso a un panel donde puede ver los análisis de inflación en tiempo real, gestionar los datos maestros (productos, categorías, comercios) y registros de precios, y administrar los usuarios.