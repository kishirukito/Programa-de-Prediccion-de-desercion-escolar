import React from 'react';

/**
 * TableLoader — reemplaza filas vacías con skeleton mientras carga
 *
 * Uso en tbody:
 *   {loading
 *     ? <TableLoader cols={5} rows={6} />
 *     : datos.length === 0
 *       ? <tr><td colSpan={5}><div className="empty-state">...</div></td></tr>
 *       : datos.map(...)
 *   }
 */
export default function TableLoader({ cols = 4, rows = 5 }) {
  const widths = ['60%', '80%', '45%', '70%', '55%', '65%', '50%', '75%'];
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="skeleton-row">
          {Array.from({ length: cols }, (_, c) => (
            <td key={c}>
              <div
                className="skeleton-cell"
                style={{ width: widths[(r * cols + c) % widths.length] }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * PageLoader — spinner centrado para bloques completos (cards, secciones)
 */
export function PageLoader({ text = 'Cargando...' }) {
  return (
    <div className="loading-spinner-wrap">
      <div className="loading-spinner" />
      <span>{text}</span>
    </div>
  );
}
