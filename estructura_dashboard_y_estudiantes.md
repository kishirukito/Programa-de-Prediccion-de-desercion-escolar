# Estructura de la Dashboard y la Pantalla de Estudiantes

Este documento detalla la estructura, componentes, métricas e interactividad de la **Dashboard (Vista General)** y la **Pantalla de Estudiantes (Gestión de Estudiantes)** dentro de la aplicación.

---

## 1. Dashboard (Vista General)
El archivo correspondiente a esta vista es [DashboardPage.jsx](file:///c:/Users/AFFC0/Desktop/Universidad%20Politecnica%20de%20Durango/Cuatrimestre%209/Administraci%C3%B3n%20de%20Proyectos/Codigo/src/pages/DashboardPage.jsx). Es la página principal de análisis que presenta indicadores predictivos, gráficos de tendencias y alertas asistidas por IA.

### A. Encabezado
* **Componente:** `TopHeader`
* **Título:** "Vista General"

### B. Tarjetas de Métricas (Stat Cards)
Se muestra una cuadrícula (grid) con tres tarjetas principales de indicadores:
1. **Estudiantes en Riesgo:**
   * **Valor:** `42`
   * **Tendencia:** `+4% vs mes ant.` (Incrustado en una etiqueta roja).
   * **Nota:** "Requiere intervención inmediata" con un icono de información (`info`).
   * **Diseño:** Icono de tendencia a la baja (`trending_down`) con fondo rojo, y gradiente decorativo rojo-rosa.
2. **Asistencia Promedio:**
   * **Valor:** `91.8%`
   * **Meta:** `Meta: 95%` (Incrustado en una etiqueta cian).
   * **Progreso:** Una barra de carga horizontal que muestra visualmente el `91.8%`.
   * **Diseño:** Icono de asistencia (`event_available`) con fondo cian, y gradiente decorativo cian-teal.
3. **Alertas IA Detectadas:**
   * **Valor:** `12`
   * **Desglose:** `3 críticas · 9 preventivas` (Incrustado en una etiqueta azul).
   * **Diseño:** Icono de advertencia (`warning`) con fondo azul, y gradiente decorativo azul-índigo.

### C. Gráfico de Tendencias de Asistencia
* **Título:** "Tendencias de Asistencia" con el subtítulo "Análisis predictivo basado en datos históricos".
* **Control Temporal:** Menú desplegable (`select`) para filtrar entre "Últimos 30 días" y "Semestre Actual".
* **Representación del Gráfico:** 
  * Barras verticales para representar los meses: **ENE (88%)**, **FEB (92%)**, **MAR (94%)**, **ABR (91%)**, **MAY (85%)** y **JUN (96%)**.
  * **Proyección IA:** El mes de JUN se visualiza como una proyección mediante un gradiente animado (`animate-pulse`) en tonos cian/teal. Las barras anteriores se muestran en color azul estándar (datos reales).
  * **Interacción (Tooltips):** Al colocar el cursor sobre cada barra, se muestra un tooltip flotante indicando el porcentaje (ej: `88%` o `PROY. 96%`).
  * **Leyenda:** Muestra la diferenciación entre "Real" (azul) y "Proyectado por IA" (cian/teal).

### D. Panel de Últimas Alertas
* **Título:** "Últimas Alertas" con un punto rojo parpadeante (`dot-pulse`) de alerta en vivo y la etiqueta de "3 nuevas".
* **Lista de Alertas Recientes:**
  1. **Deserción Potencial (Inactividad):** *Juan Pérez* — "4 días consecutivos de ausencia en 10º B." (Barra lateral e indicador rojo. Tiempo: "Hace 2 h").
  2. **Académico:** *Caída en Matemáticas* — "Lucía Méndez descendió su promedio 35%." (Barra lateral e indicador azul. Tiempo: "Hace 5 h").
  3. **Preventiva:** *Bajo rendimiento grupal* — "8°C muestra tendencia descendente en Ciencias." (Barra lateral e indicador ámbar. Tiempo: "Ayer").
* **Botón de Acción:** Enlace "Ver todas las alertas →" para navegar a la sección completa.

---

## 2. Pantalla de Estudiantes (Gestión de Estudiantes)
El archivo correspondiente a esta vista es [StudentsPage.jsx](file:///c:/Users/AFFC0/Desktop/Universidad%20Politecnica%20de%20Durango/Cuatrimestre%209/Administraci%C3%B3n%20de%20Proyectos/Codigo/src/pages/StudentsPage.jsx). Es el centro de control del alumnado que permite la administración del rendimiento y el estado de riesgo.

### A. Encabezado
* **Componente:** `TopHeader`
* **Título:** "Gestión de Estudiantes"

### B. Controles de Visualización y Acción
* **Información:** Título "Base de Datos de Estudiantes" y descripción "Monitoreo de rendimiento asistido por IA en tiempo real."
* **Selector de Vistas:** Botones para alternar entre:
  * **Vista de Lista (Tabla):** Icono `view_list`.
  * **Vista de Cuadrícula (Grid):** Icono `grid_view`.
* **Botón de Registro:** Botón "Añadir" con el icono `person_add` para ingresar nuevos estudiantes al sistema.

### C. Tabla de Estudiantes
Organiza la información de los alumnos mediante las siguientes columnas:
1. **Estudiante:**
   * Iniciales del alumno dentro de un círculo con colores representativos de su estado.
   * Nombre completo en negrita y correo electrónico (ej: `elena.mtz@edu.predict`).
   * ID de registro (ej: `#2024-0412`).
2. **Programa:** Carrera o carrera técnica a la que pertenecen (ej: "Ing. Civil", "Psicología", "Sistemas").
3. **Estado IA:** Insignia (badge) redondeada y coloreada de acuerdo al nivel de riesgo detectado por la IA:
   * `RIESGO CRÍTICO` (Fondo rojo suave y texto/punto rojo brillante).
   * `ALERTA TEMPRANA` (Fondo naranja suave y texto/punto naranja brillante).
   * `ESTABLE` (Fondo verde suave y texto/punto verde brillante).
4. **Rendimiento:**
   * Porcentaje numérico del desempeño del alumno (ej: `42%`, `68%`, `94%`).
   * Barra de nivel horizontal coloreada conforme a su estado.
5. **Acciones:**
   * Botón con icono de tres puntos verticales (`more_vert`) que abre las opciones de gestión individual del alumno.

### D. Estudiantes Registrados (Mock Data actual)

| Estudiante | ID | Programa | Estado IA | Rendimiento |
| :--- | :--- | :--- | :--- | :---: |
| **Elena Martínez** | `#2024-0412` | Ing. Civil | `RIESGO CRÍTICO` | **42%** |
| **Ricardo Gómez** | `#2024-0985` | Psicología | `ALERTA TEMPRANA` | **68%** |
| **Sofía Ortiz** | `#2024-1122` | Sistemas | `ESTABLE` | **94%** |
