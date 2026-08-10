import React, { useState } from 'react';
import TopHeader from '../components/TopHeader';
import { api } from '../api';

const nivelStyles = { 'Crítico': 'color:var(--danger);font-weight:600', 'Alto': 'color:#e67e22;font-weight:600', 'Medio': 'color:var(--warning);font-weight:600', 'Bajo': 'color:var(--success);font-weight:600' };
const estadoStyles = { 'Pendiente': 'color:var(--danger)', 'En seguimiento': 'color:var(--warning)', 'Atendida': 'color:var(--success)', 'Cerrada': 'color:var(--info)' };

export default function ReportesPage() {
  const [tipo, setTipo] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: 'info' });

  const flash = (text, type = 'info') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: 'info' }), 3000); };

  const generar = async () => {
    if (!tipo) return;
    setLoading(true);
    try {
      let extra = '';
      if (tipo === 'riesgo' && filtroNivel) extra += `&nivel=${filtroNivel}`;
      if (tipo === 'alertas' && filtroEstado) extra += `&estado=${filtroEstado}`;
      const res = await api.generarReporte(tipo, extra);
      if (res?.success) {
        setReporte(res);
        flash(`Reporte generado: ${res.total} registros`, 'success');
      }
    } catch (e) { flash('Error al generar reporte', 'error'); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (!reporte?.data?.length) { flash('No hay datos para exportar', 'warning'); return; }
    const rows = [reporte.columnas, ...reporte.data];
    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `reporte_${tipo}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    flash('CSV descargado', 'success');
  };

  const exportPDF = () => {
    if (!reporte?.data?.length) { flash('No hay datos', 'warning'); return; }
    const win = window.open('', '_blank');
    const rows = reporte.data.map(r =>
      '<tr>' + r.map(c => `<td style="padding:6px 10px;border:1px solid #ddd;font-size:12px">${String(c ?? '')}</td>`).join('') + '</tr>'
    ).join('');
    win.document.write(`<html><head><title>${reporte.titulo}</title><style>body{font-family:Inter,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th{background:#4f46e5;color:#fff;padding:8px 10px;font-size:12px;border:1px solid #ddd}h1{font-size:18px;margin-bottom:16px}@media print{button{display:none}}</style></head><body><h1>${reporte.titulo}</h1><p style="color:#6b7280;font-size:13px;margin-bottom:12px">${reporte.total} registros</p><table><thead><tr>${reporte.columnas.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><br><button onclick="window.print()">Imprimir / Guardar PDF</button></body></html>`);
    win.document.close();
    flash('Vista de impresión abierta', 'info');
  };

  const cellStyle = (val) => {
    const s = String(val ?? '');
    return nivelStyles[s] || estadoStyles[s] || '';
  };

  return (
    <div>
      <TopHeader title="Reportes e Indicadores IA" />
      <div className="page-content">
        {msg.text && <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1rem' }}>{msg.text}</div>}

        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="filter-bar">
              <select value={tipo} onChange={e => { setTipo(e.target.value); setReporte(null); setFiltroNivel(''); setFiltroEstado(''); }}>
                <option value="">Seleccionar tipo de reporte...</option>
                <option value="riesgo">📊 Estudiantes en Riesgo</option>
                <option value="alertas">🔔 Alertas</option>
                <option value="indicadores">📈 Indicadores Académicos</option>
                <option value="seguimiento">📋 Seguimientos</option>
              </select>

              {tipo === 'riesgo' && (
                <select value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)}>
                  <option value="">Todos los niveles</option>
                  <option value="critico">Crítico</option>
                  <option value="alto">Alto</option>
                  <option value="medio">Medio</option>
                  <option value="bajo">Bajo</option>
                </select>
              )}

              {tipo === 'alertas' && (
                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                  <option value="">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_seguimiento">En seguimiento</option>
                  <option value="atendida">Atendida</option>
                  <option value="cerrada">Cerrada</option>
                </select>
              )}
            </div>
          </div>
          <div className="toolbar-right">
            <button className={`btn btn-primary${loading ? ' loading' : ''}`} onClick={generar} disabled={!tipo || loading}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              {loading ? 'Generando...' : 'Generar Reporte'}
            </button>
          </div>
        </div>

        {/* Empty state */}
        {!reporte && (
          <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 56, height: 56, marginBottom: '1rem' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              <h3>Generación de Reportes</h3>
              <p>Selecciona un tipo de reporte del menú superior para comenzar.<br />Podrás ver una vista previa antes de exportar.</p>
            </div>
          </div>
        )}

        {/* Report preview */}
        {reporte && (
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '1.1rem' }}>{reporte.titulo}</h3>
                <span style={{ color: 'var(--gray-500)', fontSize: '0.8rem' }}>{reporte.total} registro(s)</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Exportar CSV
                </button>
                <button className="btn btn-secondary btn-sm" onClick={exportPDF}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  Exportar PDF
                </button>
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>{reporte.columnas.map((c, i) => <th key={i}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {reporte.data.length === 0 ? (
                      <tr><td colSpan={reporte.columnas.length} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>No se encontraron datos con los filtros seleccionados</td></tr>
                    ) : reporte.data.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => {
                          const s = cellStyle(cell);
                          return <td key={j} style={{ maxWidth: 250, whiteSpace: 'normal', ...(s ? Object.fromEntries(s.split(';').filter(Boolean).map(x => { const [k,v] = x.split(':'); return [k.trim().replace(/-([a-z])/g, (_,c) => c.toUpperCase()), v?.trim()]; })) : {}) }}>{String(cell ?? '')}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
