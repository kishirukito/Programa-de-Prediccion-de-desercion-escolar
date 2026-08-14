-- ============================================================
-- EduPredict AI — Datos Semilla Adicionales (Seed Data)
-- Ejecuta este script en el SQL Editor de Supabase para tener datos reales completos.
-- ============================================================

-- 1. Insertar Materias para la carrera de Ingeniería en Sistemas Computacionales
-- Carrera ID: 00000000-0000-0000-0000-000000000020
INSERT INTO materias (id, carrera_id, nombre, clave, creditos, horas_semana, periodo_numero, es_obligatoria)
VALUES
    ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000020', 'Cálculo Diferencial', 'MAT-101', 6, 4, 1, TRUE),
    ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000020', 'Estructuras de Datos', 'ISC-102', 8, 5, 2, TRUE),
    ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000020', 'Álgebra Lineal', 'MAT-103', 6, 4, 1, TRUE),
    ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000020', 'Programación Web', 'ISC-104', 8, 5, 2, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2. Insertar Docentes asignados a materias
-- Usuario Docente (UUID de Ricardo Silva u otro, usamos el admin como docente/tutor para este test)
INSERT INTO public.docente_materia (id, docente_id, materia_id, periodo_id, grupo, aula)
VALUES
    ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000030', 'A', 'Aula 102'),
    ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000030', 'A', 'Laboratorio B')
ON CONFLICT (id) DO NOTHING;

-- 3. Crear estudiantes adicionales de prueba
INSERT INTO estudiantes (
    id, institucion_id, carrera_id, matricula,
    nombre, apellido_paterno, apellido_materno,
    email_institucional, fecha_ingreso, edad_ingreso,
    foraneo, preferencia_carrera, trabaja, turno,
    nivel_socioeconomico, estado_inscripcion, tutor_id
) VALUES
(   -- Mateo Gómez — Excelente, bajo riesgo
    '00000000-0000-0000-0000-000000000063',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000020',
    '2024-0010', 'Mateo', 'Gómez', 'Valdez',
    'mateo.gomez@edupredict.com', '2024-01-08', 18,
    FALSE, 1, FALSE, 'matutino',
    'medio_alto', 'activo', '00000000-0000-0000-0000-000000000040'
),
(   -- Valeria Estrada — Riesgo moderado / Alerta temprana (Trabaja, foránea, calificaciones regulares)
    '00000000-0000-0000-0000-000000000064',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000020',
    '2024-0011', 'Valeria', 'Estrada', 'Ríos',
    'valeria.estrada@edupredict.com', '2024-01-08', 20,
    TRUE, 2, TRUE, 'vespertino',
    'medio_bajo', 'activo', '00000000-0000-0000-0000-000000000040'
),
(   -- Juan Pérez — Crítico (Muchas inasistencias, promedio reprobatorio en parciales)
    '00000000-0000-0000-0000-000000000065',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000020',
    '2024-0012', 'Juan', 'Pérez', 'Soto',
    'juan.perez@edupredict.com', '2024-01-08', 19,
    TRUE, 3, TRUE, 'nocturno',
    'bajo', 'activo', '00000000-0000-0000-0000-000000000040'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Registrar inscripciones de periodo para los nuevos estudiantes
INSERT INTO inscripciones_periodo
    (estudiante_id, periodo_id, cuatrimestre_actual, cuatrimestres_retraso, materias_inscritas, turno, grupo)
VALUES
    ('00000000-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000030', 2, 0, 4, 'matutino', 'A'),
    ('00000000-0000-0000-0000-000000000064', '00000000-0000-0000-0000-000000000030', 2, 0, 4, 'vespertino', 'A'),
    ('00000000-0000-0000-0000-000000000065', '00000000-0000-0000-0000-000000000030', 2, 1, 4, 'nocturno', 'A')
ON CONFLICT (estudiante_id, periodo_id) DO NOTHING;

-- 5. Insertar Calificaciones de prueba
INSERT INTO calificaciones (estudiante_id, materia_id, periodo_id, parcial_1, parcial_2, parcial_3, calificacion_final, es_recursada, estado_materia)
VALUES
    -- Mateo (Aprobando con buenas notas)
    ('00000000-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000030', 90, 85, 95, 90, FALSE, 'aprobada'),
    ('00000000-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000030', 88, 92, 90, 90, FALSE, 'aprobada'),

    -- Valeria (Calificaciones regulares y un parcial reprobado)
    ('00000000-0000-0000-0000-000000000064', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000030', 70, 55, 75, 67, FALSE, 'en_curso'),
    ('00000000-0000-0000-0000-000000000064', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000030', 75, 72, 70, 72, FALSE, 'aprobada'),

    -- Juan (Reprobando severamente)
    ('00000000-0000-0000-0000-000000000065', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000030', 45, 50, 40, 45, TRUE, 'reprobada'),
    ('00000000-0000-0000-0000-000000000065', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000030', 50, 48, 52, 50, FALSE, 'reprobada')
ON CONFLICT (estudiante_id, materia_id, periodo_id) DO NOTHING;

-- 6. Insertar Asistencias de prueba (varias fechas para armar los promedios)
-- Mateo (Asistencia excelente: 5 asistencias, 0 faltas -> 100%)
INSERT INTO asistencias (estudiante_id, materia_id, periodo_id, fecha, asistio)
VALUES
    ('00000000-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000030', '2025-02-03', TRUE),
    ('00000000-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000030', '2025-02-04', TRUE),
    ('00000000-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000030', '2025-02-05', TRUE),
    ('00000000-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000030', '2025-02-06', TRUE),
    ('00000000-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000030', '2025-02-07', TRUE)
ON CONFLICT (estudiante_id, materia_id, fecha) DO NOTHING;

-- Valeria (Asistencia regular: 4 asistio, 1 falto -> 80%)
INSERT INTO asistencias (estudiante_id, materia_id, periodo_id, fecha, asistio)
VALUES
    ('00000000-0000-0000-0000-000000000064', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000030', '2025-02-03', TRUE),
    ('00000000-0000-0000-0000-000000000064', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000030', '2025-02-04', FALSE),
    ('00000000-0000-0000-0000-000000000064', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000030', '2025-02-05', TRUE),
    ('00000000-0000-0000-0000-000000000064', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000030', '2025-02-06', TRUE),
    ('00000000-0000-0000-0000-000000000064', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000030', '2025-02-07', TRUE)
ON CONFLICT (estudiante_id, materia_id, fecha) DO NOTHING;

-- Juan (Asistencia crítica: 2 asistio, 3 falto -> 40%)
INSERT INTO asistencias (estudiante_id, materia_id, periodo_id, fecha, asistio, motivo_falta)
VALUES
    ('00000000-0000-0000-0000-000000000065', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000030', '2025-02-03', FALSE, 'Problemas de salud'),
    ('00000000-0000-0000-0000-000000000065', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000030', '2025-02-04', FALSE, 'Tuvo que trabajar'),
    ('00000000-0000-0000-0000-000000000065', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000030', '2025-02-05', TRUE, NULL),
    ('00000000-0000-0000-0000-000000000065', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000030', '2025-02-06', FALSE, 'Sin transporte'),
    ('00000000-0000-0000-0000-000000000065', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000030', '2025-02-07', TRUE, NULL)
ON CONFLICT (estudiante_id, materia_id, fecha) DO NOTHING;

-- 7. Ejecutar la función almacenada para inicializar el resumen académico básico
-- Esto calculará promedios, asistencias, reprobadas en la tabla resumen_academico.
-- Luego el microservicio de IA actualizará las columnas predictivas en base a este resumen.
SELECT fn_calcular_resumen('00000000-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000030');
SELECT fn_calcular_resumen('00000000-0000-0000-0000-000000000064', '00000000-0000-0000-0000-000000000030');
SELECT fn_calcular_resumen('00000000-0000-0000-0000-000000000065', '00000000-0000-0000-0000-000000000030');
