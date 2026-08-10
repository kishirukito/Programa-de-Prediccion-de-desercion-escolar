import React, { useState, useEffect } from 'react';
import TopHeader from '../components/TopHeader';
import { api } from '../api';

const SCRIPT_SQL = `-- EduPredict AI — Base de Datos Supabase (PostgreSQL)
-- Sistema de Predicción de Deserción Escolar Universitaria
-- Ejecuta este script en el SQL Editor de Supabase
-- https://supabase.com/dashboard/project/pdovigscngfiijthrxjq/sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS
CREATE TYPE turno_enum         AS ENUM ('matutino','vespertino','nocturno','mixto');
CREATE TYPE estado_riesgo_enum AS ENUM ('estable','alerta_temprana','riesgo_moderado','riesgo_critico');
CREATE TYPE genero_enum        AS ENUM ('masculino','femenino','otro','prefiero_no_decir');
CREATE TYPE rol_usuario_enum   AS ENUM ('admin','director','coordinador','docente','tutor');
CREATE TYPE estado_beca_enum   AS ENUM ('activa','suspendida','cancelada','concluida');
CREATE TYPE estado_materia_enum AS ENUM ('aprobada','reprobada','recursada','en_curso','baja');
CREATE TYPE modalidad_enum     AS ENUM ('presencial','virtual','hibrida');
CREATE TYPE periodo_tipo_enum  AS ENUM ('cuatrimestre','semestre','trimestre');

-- Tablas: instituciones, departamentos, carreras, periodos_academicos,
--         usuarios, estudiantes, materias, inscripciones_periodo,
--         calificaciones, asistencias, becas, resumen_academico (18 vars MDI),
--         predicciones_desercion, alertas, intervenciones, docente_materia

-- Ver script completo en /database/schema.sql del proyecto`;

const TABLAS = [
  { nombre: 'instituciones',         cols: ['id','nombre','clave_oficial','ciudad','estado_pais','activo'] },
  { nombre: 'departamentos',         cols: ['id','institucion_id','nombre','clave','activo'] },
  { nombre: 'carreras',              cols: ['id','nombre','clave_programa','nivel','duracion_periodos','tipo_periodo'] },
  { nombre: 'periodos_academicos',   cols: ['id','nombre','tipo','numero','anio','fecha_inicio','fecha_fin','activo'] },
  { nombre: 'usuarios',              cols: ['id','nombre','apellidos','email','rol','activo'] },
  { nombre: 'estudiantes',           cols: ['id','matricula','nombre','apellido_paterno','carrera_id','estado_inscripcion','trabaja','foraneo','turno'] },
  { nombre: 'materias',              cols: ['id','nombre','clave','creditos','periodo_numero','es_obligatoria'] },
  { nombre: 'inscripciones_periodo', cols: ['id','estudiante_id','periodo_id','cuatrimestre_actual','cuatrimestres_retraso','materias_inscritas'] },
  { nombre: 'calificaciones',        cols: ['id','estudiante_id','materia_id','parcial_1','parcial_2','parcial_3','calificacion_final','es_recursada','estado_materia'] },
  { nombre: 'asistencias',           cols: ['id','estudiante_id','materia_id','fecha','asistio','justificada'] },
  { nombre: 'resumen_academico',     cols: ['id','estudiante_id','periodo_id','materias_reprobadas (0.2061)','asistencia_promedio (0.1477)','parciales_reprobados (0.1443)','materias_recursadas (0.1243)','promedio_actual (0.0834)','promedio_general (0.0682)','materias_aprobadas (0.0378)','cuatrimestre_actual (0.0345)','probabilidad_desercion','estado_riesgo'] },
  { nombre: 'predicciones_desercion',cols: ['id','estudiante_id','features_input (JSON)','probabilidad_desercion','estado_riesgo','confianza_modelo','modelo_version','fecha_prediccion'] },
  { nombre: 'alertas',               cols: ['id','estudiante_id','tipo','nivel','titulo','descripcion','atendida'] },
  { nombre: 'intervenciones',        cols: ['id','estudiante_id','tutor_id','fecha','tipo_intervencion','descripcion','resultado'] },
];

const MDI_VARS = [
  { rank:1,  nombre:'materias_reprobadas',         importancia:'0.2061', descripcion:'Número de materias reprobadas en el periodo' },
  { rank:2,  nombre:'asistencia_promedio',         importancia:'0.1477', descripcion:'Porcentaje de asistencia promedio (0-100)' },
  { rank:3,  nombre:'parciales_reprobados',        importancia:'0.1443', descripcion:'Número de parciales con calificación menor a 6.0' },
  { rank:4,  nombre:'materias_recursadas',         importancia:'0.1243', descripcion:'Materias que el alumno ha vuelto a cursar' },
  { rank:5,  nombre:'promedio_actual',             importancia:'0.0834', descripcion:'Promedio de calificaciones del periodo actual' },
  { rank:6,  nombre:'promedio_general',            importancia:'0.0682', descripcion:'Promedio histórico acumulado del alumno' },
  { rank:7,  nombre:'materias_aprobadas',          importancia:'0.0378', descripcion:'Materias aprobadas en el periodo actual' },
  { rank:8,  nombre:'calificacion_maxima_parcial', importancia:'0.0375', descripcion:'Calificación más alta obtenida en un parcial' },
  { rank:9,  nombre:'cuatrimestre_actual',         importancia:'0.0345', descripcion:'Cuatrimestre/semestre que cursa actualmente' },
  { rank:10, nombre:'calificacion_minima_parcial', importancia:'0.0275', descripcion:'Calificación más baja obtenida en un parcial' },
  { rank:11, nombre:'preferencia_carrera',         importancia:'0.0204', descripcion:'Orden de preferencia al elegir la carrera (1=primera opción)' },
  { rank:12, nombre:'cuatrimestres_retraso',       importancia:'0.0175', descripcion:'Cuatrimestres de retraso respecto al plan de estudios' },
  { rank:13, nombre:'edad_ingreso',                importancia:'0.0138', descripcion:'Edad del alumno al ingresar a la institución' },
  { rank:14, nombre:'beneficiario_beca',           importancia:'0.0131', descripcion:'Si el alumno tiene beca activa (booleano)' },
  { rank:15, nombre:'trabaja',                     importancia:'0.0067', descripcion:'Si el alumno trabaja además de estudiar (booleano)' },
  { rank:16, nombre:'materias_inscritas',          importancia:'0.0066', descripcion:'Total de materias inscritas en el periodo' },
  { rank:17, nombre:'turno',                       importancia:'0.0062', descripcion:'Turno escolar: matutino, vespertino, nocturno' },
  { rank:18, nombre:'foraneo',                     importancia:'0.0044', descripcion:'Si el alumno viene de otra ciudad/estado (booleano)' },
];

export default function BaseDatosPage() {
  const [tab, setTab]           = useState('estado');
  const [status, setStatus]     = useState(null);
  const [loadingStatus, setLS]  = useState(false);
  const [estudiantes, setEst]   = useState([]);
  const [resumen, setResumen]   = useState([]);
  const [loadingData, setLD]    = useState(false);
  const [copied, setCopied]     = useState(false);

  const verificar = async () => {
    setLS(true);
    try { const r = await api.supabaseStatus(); setStatus(r); }
    catch (e) { setStatus({ success: false, connected: false, message: e.message }); }
    setLS(false);
  };

  const cargarDatos = async () => {
    setLD(true);
    try {
      const [re, rr] = await Promise.all([api.supabaseEstudiantes(), api.supabaseResumen()]);
      if (re?.success) setEst(re.data || []);
      if (rr?.success) setResumen(rr.data || []);
    } catch (e) { console.error(e); }
    setLD(false);
  };

  useEffect(() => { verificar(); }, []);

  const copiarSQL = () => {
    navigator.clipboard.writeText(SCRIPT_SQL).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };

  const TABS = [
    { id: 'estado',    label: 'Estado de Conexión' },
    { id: 'esquema',   label: 'Esquema de Tablas' },
    { id: 'variables', label: '18 Variables MDI' },
    { id: 'datos',     label: 'Datos en Vivo' },
    { id: 'sql',       label: 'Script SQL' },
  ];

  return (
    <div>
      <TopHeader title="Base de Datos" />
      <div className="page-content">
        <div className="card">
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid var(--gray-200)', padding: '0 1.25rem' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: '0.75rem 1.1rem', fontSize: '0.85rem', fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? 'var(--primary-600)' : 'var(--gray-500)', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid var(--primary-600)' : '2px solid transparent', marginBottom: -2, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Estado ── */}
          {tab === 'estado' && (
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: 'var(--gray-900)' }}>Conexión Supabase</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{process.env.SUPABASE_URL || 'https://pdovigscngfiijthrxjq.supabase.co'}</div>
                </div>
                <button className={`btn btn-primary${loadingStatus ? ' loading' : ''}`} onClick={verificar} disabled={loadingStatus}>
                  {loadingStatus ? 'Verificando...' : 'Verificar Conexión'}
                </button>
              </div>

              {status && (
                <div style={{ padding: '1rem', borderRadius: 'var(--border-radius)', background: status.connected ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${status.connected ? 'var(--success-border)' : 'var(--danger-border)'}`, marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <span style={{ fontSize: 18 }}>{status.connected ? '✓' : '✗'}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: status.connected ? 'var(--success)' : 'var(--danger)' }}>
                        {status.connected ? 'Conexión exitosa' : 'Sin conexión'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginTop: 2 }}>{status.message}</div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.875rem' }}>
                {[
                  { label: 'URL Proyecto',   value: 'pdovigscngfiijthrxjq.supabase.co', icon: '🔗' },
                  { label: 'Base de Datos',  value: 'PostgreSQL 15',                    icon: '🗄️' },
                  { label: 'Región',         value: 'us-east-1',                        icon: '🌎' },
                  { label: 'Tablas',         value: `${TABLAS.length} tablas`,          icon: '📋' },
                  { label: 'Variables MDI',  value: '18 variables',                     icon: '🤖' },
                  { label: 'RLS',            value: 'Habilitado',                       icon: '🔒' },
                ].map((item, i) => (
                  <div key={i} style={{ padding: '0.875rem', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 'var(--border-radius)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{item.icon} {item.label}</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-800)' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Esquema ── */}
          {tab === 'esquema' && (
            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '1.25rem' }}>
                Estructura de las {TABLAS.length} tablas del sistema. Haz clic en una tabla para ver sus columnas.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.75rem' }}>
                {TABLAS.map((t, i) => (
                  <details key={i} style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--border-radius)', overflow: 'hidden' }}>
                    <summary style={{ padding: '0.75rem 1rem', background: 'var(--gray-50)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-800)', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                      {t.nombre}
                      <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--gray-400)', fontWeight: 400 }}>{t.cols.length} cols</span>
                    </summary>
                    <div style={{ padding: '0.625rem 1rem' }}>
                      {t.cols.map((c, j) => (
                        <div key={j} style={{ fontSize: '0.78rem', color: 'var(--gray-600)', padding: '2px 0', borderBottom: j < t.cols.length-1 ? '1px solid var(--gray-100)' : 'none' }}>
                          <span style={{ fontFamily: 'monospace', color: 'var(--primary-600)' }}>{c}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* ── Variables MDI ── */}
          {tab === 'variables' && (
            <div>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--gray-100)', background: 'var(--primary-50)' }}>
                <div style={{ fontWeight: 700, color: 'var(--primary-700)', fontSize: '0.9rem' }}>Modelo MDI — Mean Decrease in Impurity</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--primary-600)', marginTop: 2 }}>18 variables ordenadas por importancia en el modelo de predicción de deserción escolar</div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>#</th><th>Variable</th><th>Importancia MDI</th><th>Descripción</th></tr>
                  </thead>
                  <tbody>
                    {MDI_VARS.map(v => (
                      <tr key={v.rank}>
                        <td style={{ fontWeight: 700, color: 'var(--gray-400)', width: 40 }}>{v.rank}</td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--primary-50)', color: 'var(--primary-700)', padding: '2px 6px', borderRadius: 4 }}>{v.nombre}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 80, height: 6, background: 'var(--gray-100)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${(parseFloat(v.importancia) / 0.2061) * 100}%`, height: '100%', background: parseFloat(v.importancia) > 0.1 ? 'var(--danger)' : parseFloat(v.importancia) > 0.05 ? 'var(--warning)' : 'var(--primary-400)', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)' }}>{v.importancia}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>{v.descripcion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Datos en vivo ── */}
          {tab === 'datos' && (
            <div style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Datos en tiempo real desde Supabase</span>
                <button className={`btn btn-primary${loadingData ? ' loading' : ''}`} onClick={cargarDatos} disabled={loadingData}>
                  {loadingData ? 'Cargando...' : 'Cargar Datos'}
                </button>
              </div>

              {estudiantes.length === 0 && resumen.length === 0 && !loadingData && (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, height: 48 }}><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/></svg>
                  <h3>Sin datos</h3>
                  <p>Haz clic en "Cargar Datos" para consultar Supabase</p>
                </div>
              )}

              {resumen.length > 0 && (
                <>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--gray-700)', margin: '0 0 0.75rem' }}>Resumen Académico — Variables MDI ({resumen.length} registros)</h4>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr><th>Alumno</th><th>Mat. Reprob.</th><th>Asistencia</th><th>Prom. Actual</th><th>Probabilidad Deserción</th><th>Estado Riesgo</th></tr>
                      </thead>
                      <tbody>
                        {resumen.slice(0, 10).map((r, i) => {
                          const nCls = { estable: 'badge-risk-low', alerta_temprana: 'badge-risk-medium', riesgo_moderado: 'badge-risk-high', riesgo_critico: 'badge-risk-critical' }[r.estado_riesgo] || 'badge-info';
                          const nLbl = { estable: 'Estable', alerta_temprana: 'Alerta Temprana', riesgo_moderado: 'Riesgo Moderado', riesgo_critico: 'Riesgo Crítico' }[r.estado_riesgo] || r.estado_riesgo;
                          return (
                            <tr key={i}>
                              <td style={{ fontSize: '0.8rem' }}>{r.estudiante?.matricula || r.estudiante_id?.slice(0,8)}</td>
                              <td style={{ fontWeight: 700, color: r.materias_reprobadas > 0 ? 'var(--danger)' : 'var(--success)' }}>{r.materias_reprobadas}</td>
                              <td>{r.asistencia_promedio}%</td>
                              <td>{r.promedio_actual}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ width: 60, height: 6, background: 'var(--gray-100)', borderRadius: 3 }}>
                                    <div style={{ width: `${Math.min(r.probabilidad_desercion * 100, 100)}%`, height: '100%', background: r.probabilidad_desercion > 0.7 ? 'var(--danger)' : r.probabilidad_desercion > 0.4 ? 'var(--warning)' : 'var(--success)', borderRadius: 3 }} />
                                  </div>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{Math.round(r.probabilidad_desercion * 100)}%</span>
                                </div>
                              </td>
                              <td><span className={`badge ${nCls} badge-dot`}>{nLbl}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Script SQL ── */}
          {tab === 'sql' && (
            <div style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-800)' }}>Script SQL completo</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Ejecuta este script en el SQL Editor de Supabase para crear todas las tablas</div>
                </div>
                <button className="btn btn-secondary" onClick={copiarSQL}>
                  {copied ? '✓ Copiado' : 'Copiar SQL'}
                </button>
              </div>
              <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: '1.25rem', borderRadius: 'var(--border-radius)', fontSize: '0.75rem', lineHeight: 1.7, overflowX: 'auto', maxHeight: 480, overflowY: 'auto' }}>
                {SCRIPT_SQL}
              </pre>
              <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'var(--info-bg)', border: '1px solid var(--info-border)', borderRadius: 'var(--border-radius)', fontSize: '0.8rem', color: 'var(--info)' }}>
                <strong>Pasos:</strong> 1) Abre Supabase → SQL Editor &nbsp;2) Pega el script completo &nbsp;3) Haz clic en "Run" &nbsp;4) Verifica la conexión desde esta página
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
