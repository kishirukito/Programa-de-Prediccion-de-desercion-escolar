# EduPredict AI — Sistema de Predicción de Deserción Escolar

Sistema web de monitoreo y predicción de riesgo de deserción escolar para instituciones de nivel superior. Combina un dashboard en tiempo real, captura de calificaciones y asistencias, y un modelo de Machine Learning (Random Forest) que calcula la probabilidad de que un alumno abandone sus estudios.

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────┐
│                     Navegador                           │
│           React + Vite  (puerto 5173)                   │
└────────────────────┬────────────────────────────────────┘
                     │  HTTP / JSON
┌────────────────────▼────────────────────────────────────┐
│              Backend Node.js / Express                  │
│                   (puerto 5000)                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  routes/    │  │  helpers/    │  │  middleware/  │  │
│  │  auth       │  │  mapRiesgo   │  │  auth (JWT)   │  │
│  │  dashboard  │  │  usuarios    │  └───────────────┘  │
│  │  expedientes│  │  resumen     │                      │
│  │  captura    │  └──────────────┘                      │
│  │  alertas    │                                        │
│  │  docentes   │                                        │
│  │  usuarios   │                                        │
│  │  catalogos  │                                        │
│  │  reportes   │                                        │
│  │  supabase   │  ← predicción IA                       │
│  └─────────────┘                                        │
└──────────┬──────────────────────────┬───────────────────┘
           │  Supabase JS SDK         │  fetch HTTP
┌──────────▼───────────┐   ┌──────────▼──────────────────┐
│   Supabase (Postgres)│   │  Microservicio IA (Python)  │
│   Base de datos      │   │  FastAPI + Uvicorn          │
│   Auth               │   │  puerto 8000                │
│   Row Level Security │   │  Random Forest (.pkl)       │
└──────────────────────┘   └─────────────────────────────┘
```

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | React | 18.3 |
| Bundler | Vite | 5.3 |
| Estilos | Tailwind CSS + CSS custom | 3.4 |
| Routing | React Router DOM | 6.22 |
| Backend | Node.js + Express | 4.19 |
| Autenticación | JWT (jsonwebtoken) | 9.0 |
| Base de datos | Supabase (PostgreSQL) | — |
| ORM/Cliente | @supabase/supabase-js | 2.x |
| Modelo IA | Python + scikit-learn (Random Forest) | — |
| API IA | FastAPI + Uvicorn | — |
| Serialización modelo | joblib (.pkl) | — |

---

## Estructura del proyecto

```
/
├── src/                        # Frontend React
│   ├── pages/
│   │   ├── DashboardPage.jsx   # Panel principal con métricas
│   │   ├── ExpedientesPage.jsx # Lista y detalle de alumnos
│   │   ├── CapturPage.jsx      # Captura de calificaciones y asistencias
│   │   ├── AlertasPage.jsx     # Gestión de alertas tempranas
│   │   ├── DocentesPage.jsx    # Asignaciones y tutorías
│   │   ├── UsuariosPage.jsx    # Administración de usuarios
│   │   └── ...
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   └── TopHeader.jsx
│   └── api.js                  # Cliente HTTP centralizado
│
├── backend/
│   ├── server.js               # Punto de entrada (arranque + montaje de rutas)
│   ├── db.js                   # Cliente Supabase (singleton)
│   ├── middleware/
│   │   └── auth.js             # Middleware JWT (requireAuth)
│   ├── helpers/
│   │   ├── mapRiesgo.js        # mapEstadoRiesgo()
│   │   ├── usuarios.js         # getUsuariosPorRol()
│   │   └── resumen.js          # recalcularResumen()
│   └── routes/
│       ├── auth.js             # POST /login, GET /me
│       ├── dashboard.js        # GET /dashboard
│       ├── expedientes.js      # GET /expedientes, GET /expedientes/:id
│       ├── captura.js          # GET/POST /captura/*
│       ├── alertas.js          # GET/POST/PUT /alertas/*
│       ├── usuarios.js         # CRUD /usuarios, GET /roles
│       ├── docentes.js         # /docentes, /docentes/asignaciones, /tutorias
│       ├── catalogos.js        # /catalogos/carreras, /grupos, /materias
│       ├── reportes.js         # /reportes/datos, /reportes/preview
│       └── supabase.js         # /supabase/*, POST /supabase/calcular-resumen (IA)
│
├── AI/
│   ├── api_ia.py               # Microservicio FastAPI (predicción)
│   └── Proyecto_Desercion_Escolar/
│       └── modelos/
│           └── random_forest_optimizado.pkl
│
└── DB/
    ├── schema.sql              # Estructura de tablas
    ├── seed_datos.sql          # Datos base (periodo 2026-1)
    └── seed_2026_2.sql         # Datos periodo 2026-2
```

---

## Base de datos (Supabase / PostgreSQL)

### Tablas principales

| Tabla | Descripción |
|---|---|
| `estudiantes` | Datos personales y académicos del alumno |
| `carreras` | Programas académicos de la institución |
| `grupos` | Grupos activos por carrera, cuatrimestre y periodo |
| `periodos_academicos` | Cuatrimestres con fecha inicio y fin |
| `inscripciones_periodo` | Relación alumno ↔ grupo ↔ periodo |
| `materias` | Catálogo de materias |
| `docente_materia` | Asignación docente ↔ materia ↔ grupo |
| `calificaciones` | Parciales 1, 2 y 3 por alumno/materia/periodo |
| `asistencias` | Registro diario de asistencia por alumno/materia |
| `resumen_academico` | Resumen calculado: promedio, asistencia, riesgo, probabilidad |
| `predicciones_desercion` | Historial de predicciones del modelo IA |
| `alertas` | Alertas tempranas generadas por el sistema |
| `usuarios` | Docentes, tutores, coordinadores y administradores |
| `instituciones` | Datos de la institución |

### Enums relevantes

```sql
estado_riesgo_enum: 'estable' | 'alerta_temprana' | 'riesgo_moderado' | 'riesgo_critico'
turno_enum:         'matutino' | 'vespertino' | 'nocturno' | 'mixto'
```

---

## Módulo de Inteligencia Artificial

### Modelo

- **Algoritmo**: Random Forest Classifier (scikit-learn)
- **Archivo**: `AI/Proyecto_Desercion_Escolar/modelos/random_forest_optimizado.pkl`
- **Tarea**: Clasificación binaria — predice si un alumno desertará o no
- **Salida principal**: `probabilidad_desercion` (0.0 – 1.0)

### Variables de entrada (features)

| Variable | Tipo | Descripción |
|---|---|---|
| `promedio_general` | float | Promedio histórico del alumno |
| `promedio_actual` | float | Promedio en el periodo actual |
| `asistencia_promedio` | float | Porcentaje de asistencia (0.0 – 1.0) |
| `materias_reprobadas` | int | Total de materias con calificación < 7 |
| `materias_recursadas` | int | Materias que el alumno ha recursado |
| `materias_inscritas` | int | Materias inscritas en el periodo |
| `materias_aprobadas` | int | Materias aprobadas en el periodo |
| `cuatrimestre_actual` | int | Cuatrimestre en el que está inscrito |
| `cuatrimestres_retraso` | int | Cuatrimestres de retraso respecto al plan |
| `parciales_reprobados` | int | Cantidad de parciales con calificación < 7 |
| `calificacion_minima_parcial` | float | La calificación más baja en un parcial |
| `calificacion_maxima_parcial` | float | La calificación más alta en un parcial |
| `beneficiario_beca` | int | 1 si tiene beca, 0 si no |
| `turno` | int | 0=matutino, 1=vespertino, 2=nocturno, 3=mixto |
| `preferencia_carrera` | int | 0=primera opción, 1=segunda, 2=tercera |
| `foraneo` | int | 1 si es foráneo, 0 si es local |
| `trabaja` | int | 1 si trabaja, 0 si no |
| `edad_ingreso` | int | Edad al ingresar a la institución |

### Umbrales de clasificación

| Probabilidad | Estado de riesgo | Etiqueta en frontend |
|---|---|---|
| > 0.70 | `riesgo_critico` | Crítico (rojo) |
| 0.40 – 0.70 | `riesgo_moderado` | Alto (naranja) |
| 0.20 – 0.40 | `alerta_temprana` | Medio (azul) |
| ≤ 0.20 | `estable` | Bajo (verde) |

### Flujo de predicción

```
1. Docente captura calificaciones y asistencias
        ↓
2. Backend llama fn_calcular_resumen (RPC en Supabase)
   → recalcula resumen_academico con datos actuales
        ↓
3. Backend construye el payload de 18 variables
        ↓
4. POST http://localhost:8000/predict → FastAPI
        ↓
5. Random Forest devuelve probabilidad_desercion + estado_riesgo
        ↓
6. Backend guarda en resumen_academico y predicciones_desercion
        ↓
7. Frontend actualiza el badge de nivel de riesgo del alumno
```

> Si el microservicio de IA no está disponible, el backend aplica un **fallback heurístico** basado en materias reprobadas y asistencia para no interrumpir el flujo.

---

## Autenticación y roles

El sistema usa **JWT** con expiración de 8 horas. El login se realiza contra **Supabase Auth** y el perfil de rol se lee de la tabla `public.usuarios`.

| Rol | Acceso |
|---|---|
| `admin` | Acceso completo: dashboard, expedientes, usuarios, reportes |
| `director` | Dashboard, expedientes, reportes |
| `coordinador` | Expedientes, reportes |
| `docente` / `profesor` | Solo sus grupos asignados en captura y expedientes |
| `tutor` / `Tutor Académico` | Alertas, expedientes de sus tutorados |

> La comparación de roles es case-insensitive y soporta variantes de texto (ej. "Tutor Académico", "Docente", "Profesor").

---

## Instalación y ejecución

### Requisitos

- Node.js ≥ 18
- Python ≥ 3.10
- Cuenta en [Supabase](https://supabase.com)

### Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
PORT=5000
JWT_SECRET=tu_secreto_jwt
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_anon_key
```

### Instalar dependencias

```bash
# Node.js
npm install

# Python
pip install fastapi uvicorn joblib pandas scikit-learn
```

### Ejecutar en desarrollo

```bash
npm run dev
```

Esto levanta los tres servicios en paralelo con `concurrently`:

| Servicio | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend (Express) | http://localhost:5000 |
| IA (FastAPI) | http://localhost:8000 |

### Base de datos

1. Crea un proyecto en Supabase
2. Ejecuta `DB/schema.sql` en el SQL Editor
3. Ejecuta `DB/seed_datos.sql` para los datos base
4. Ejecuta `DB/seed_2026_2.sql` para el periodo 2026-2 (opcional)

---

## API — endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Login con email y contraseña |
| GET | `/api/dashboard` | Métricas generales y filtros |
| GET | `/api/expedientes` | Lista de alumnos con nivel de riesgo |
| GET | `/api/expedientes/:id` | Detalle completo de un alumno |
| GET | `/api/captura/grupos` | Grupos disponibles para captura |
| GET | `/api/captura/alumnos` | Alumnos de un grupo |
| POST | `/api/captura/guardar` | Guarda calificaciones o asistencias |
| GET | `/api/captura/resumen-grupo` | Promedio y asistencia en tiempo real |
| GET | `/api/alertas` | Alertas con tutor asignado |
| POST | `/api/alertas/generar` | Genera alertas desde resumen_academico |
| POST | `/api/supabase/calcular-resumen` | Ejecuta RPC + predicción IA |
| GET | `/api/reportes/preview` | Vista previa de reportes (riesgo, alertas, etc.) |

---

## Funcionalidades principales

- **Dashboard** — Distribución de riesgo, evolución por parcial, alumnos en riesgo recientes, filtros por periodo y grupo.
- **Expedientes** — Vista tabular con promedio, asistencia y nivel de riesgo. Modal con detalle completo y botón de análisis IA.
- **Analizar todos con IA** — Botón en Expedientes que ejecuta la predicción para todos los alumnos cargados de forma secuencial.
- **Captura de calificaciones** — Ingreso de parciales por grupo y materia. Guarda automáticamente en BD y recalcula `resumen_academico`.
- **Captura de asistencias** — Calendario visual con validación de fechas futuras. Días futuros bloqueados visualmente.
- **Alertas tempranas** — Listado con tutor asignado, filtros por estado, gestión de atención.
- **Docentes y tutorías** — Asignaciones docente-grupo-materia y asignación de tutores a alumnos.
- **Reportes** — Tablas exportables de riesgo, indicadores, alertas y seguimiento.

---

## Licencia

Proyecto académico — uso educativo e institucional.
