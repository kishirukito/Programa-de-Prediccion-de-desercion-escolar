"""
===========================================================================
 SCRIPT 02 - LIMPIEZA Y VALIDACION DE DATOS
 Proyecto : Prediccion de Desercion Escolar - Ingenieria en Software
 Entrada  : dataset/dataset_desercion_escolar.csv
 Salidas  : dataset/dataset_limpio.csv | reportes/reporte_limpieza.txt
===========================================================================
 Metodologia CRISP-DM - Fase: Preparacion de Datos
 Python   : 3.12
===========================================================================
"""

import sys
import io
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# ===========================================================================
#  RUTAS
# ===========================================================================
BASE_DIR      = Path(__file__).parent
DIR_DATASET   = BASE_DIR / "dataset"
DIR_REPORTES  = BASE_DIR / "reportes"
RUTA_ENTRADA  = DIR_DATASET / "dataset_desercion_escolar.csv"
RUTA_SALIDA   = DIR_DATASET / "dataset_limpio.csv"
RUTA_REPORTE  = DIR_REPORTES / "reporte_limpieza.txt"

# Rangos validos por variable
RANGOS_VALIDOS = {
    "promedio_general"           : (5.0, 10.0),
    "promedio_actual"            : (5.0, 10.0),
    "asistencia_promedio"        : (0.40, 1.00),
    "materias_reprobadas"        : (0, 63),
    "materias_recursadas"        : (0, 63),
    "materias_inscritas"         : (1, 7),
    "materias_aprobadas"         : (0, 63),
    "cuatrimestre_actual"        : (1, 10),
    "cuatrimestres_retraso"      : (0, 10),
    "parciales_reprobados"       : (0, 200),
    "calificacion_minima_parcial": (0.0, 10.0),
    "calificacion_maxima_parcial": (0.0, 10.0),
    "edad_ingreso"               : (15, 50),
}

# Variables que solo admiten valores en conjuntos discretos
VALORES_DISCRETOS = {
    "beneficiario_beca"  : {0, 1},
    "turno"              : {0, 1, 2, 3},
    "preferencia_carrera": {0, 1, 2},
    "foraneo"            : {0, 1},
    "trabaja"            : {0, 1},
    "desercion"          : {0, 1},
}


# ===========================================================================
#  FUNCION: crear_directorios
# ===========================================================================
def crear_directorios():
    """Crea los directorios de salida si no existen."""
    for d in [DIR_DATASET, DIR_REPORTES]:
        d.mkdir(parents=True, exist_ok=True)


# ===========================================================================
#  FUNCION: cargar_datos
# ===========================================================================
def cargar_datos(ruta: Path) -> pd.DataFrame:
    """
    Carga el dataset desde un archivo CSV.

    Parametros
    ----------
    ruta : Path
        Ruta al archivo CSV.

    Retorna
    -------
    pd.DataFrame con los datos cargados.

    Lanza
    -----
    FileNotFoundError si el archivo no existe.
    """
    if not ruta.exists():
        raise FileNotFoundError(
            f"[ERROR] No se encontro el archivo: {ruta}\n"
            "Ejecuta primero el script 01_generar_dataset.py"
        )
    df = pd.read_csv(ruta, encoding="utf-8-sig")
    print(f"[OK] Dataset cargado: {ruta.name}  ({len(df):,} registros x {df.shape[1]} columnas)")
    return df


# ===========================================================================
#  FUNCION: mostrar_info_general
# ===========================================================================
def mostrar_info_general(df: pd.DataFrame) -> list:
    """
    Muestra y registra informacion general del dataset:
    shape, tipos de datos, primeras filas y estadisticas basicas.
    """
    lineas = []
    lineas.append("\n[INFO GENERAL]")
    lineas.append(f"  Filas      : {df.shape[0]:,}")
    lineas.append(f"  Columnas   : {df.shape[1]}")
    lineas.append(f"  Memoria    : {df.memory_usage(deep=True).sum() / 1024:.1f} KB")
    lineas.append("\n  Tipos de datos:")
    for col, dtype in df.dtypes.items():
        lineas.append(f"    {col:<35} {str(dtype)}")
    print("\n".join(lineas))
    return lineas


# ===========================================================================
#  FUNCION: detectar_valores_faltantes
# ===========================================================================
def detectar_valores_faltantes(df: pd.DataFrame) -> tuple:
    """
    Detecta columnas con valores nulos o vacios.

    Retorna
    -------
    (lineas: list, n_faltantes: int)
    """
    nulos = df.isnull().sum()
    total = nulos.sum()
    lineas = ["\n[VALORES FALTANTES]"]

    if total == 0:
        lineas.append("  Sin valores faltantes. Dataset completo.")
    else:
        lineas.append(f"  Total de celdas con NaN: {total:,}")
        for col, cnt in nulos[nulos > 0].items():
            pct = cnt / len(df) * 100
            lineas.append(f"  {col:<35} {cnt:>5}  ({pct:.2f}%)")

    print("\n".join(lineas))
    return lineas, int(total)


# ===========================================================================
#  FUNCION: detectar_y_eliminar_duplicados
# ===========================================================================
def detectar_y_eliminar_duplicados(df: pd.DataFrame) -> tuple:
    """
    Detecta y elimina filas completamente duplicadas.

    Retorna
    -------
    (df_limpio: pd.DataFrame, lineas: list, n_eliminados: int)
    """
    n_dup = df.duplicated().sum()
    lineas = ["\n[DUPLICADOS]"]
    lineas.append(f"  Filas duplicadas detectadas: {n_dup:,}")

    if n_dup > 0:
        df = df.drop_duplicates().reset_index(drop=True)
        lineas.append(f"  Filas eliminadas: {n_dup:,}")
        lineas.append(f"  Registros restantes: {len(df):,}")
    else:
        lineas.append("  Sin duplicados. Dataset integro.")

    print("\n".join(lineas))
    return df, lineas, int(n_dup)


# ===========================================================================
#  FUNCION: validar_id_unico
# ===========================================================================
def validar_id_unico(df: pd.DataFrame) -> list:
    """
    Verifica que la columna id_estudiante no tenga valores repetidos.
    """
    col = "id_estudiante"
    lineas = ["\n[UNICIDAD DE id_estudiante]"]

    if col not in df.columns:
        lineas.append("  AVISO: columna id_estudiante no encontrada.")
    else:
        n_total  = len(df)
        n_unicos = df[col].nunique()
        n_duplic = n_total - n_unicos
        lineas.append(f"  Total registros    : {n_total:,}")
        lineas.append(f"  IDs unicos         : {n_unicos:,}")
        lineas.append(f"  IDs duplicados     : {n_duplic:,}")
        if n_duplic == 0:
            lineas.append("  [OK] Todos los IDs son unicos.")
        else:
            lineas.append(f"  [ALERTA] {n_duplic} IDs repetidos detectados.")

    print("\n".join(lineas))
    return lineas


# ===========================================================================
#  FUNCION: verificar_rangos
# ===========================================================================
def verificar_rangos(df: pd.DataFrame) -> tuple:
    """
    Verifica que cada variable numerica este dentro del rango valido.
    Tambien verifica que las variables discretas tengan valores admisibles.

    Retorna
    -------
    (lineas: list, n_violaciones: int)
    """
    lineas = ["\n[VERIFICACION DE RANGOS]"]
    total_viol = 0

    # Rangos numericos
    for col, (lo, hi) in RANGOS_VALIDOS.items():
        if col not in df.columns:
            continue
        fuera = ((df[col] < lo) | (df[col] > hi)).sum()
        total_viol += int(fuera)
        estado = "[OK]" if fuera == 0 else "[ALERTA]"
        lineas.append(f"  {estado} {col:<35} [{lo}, {hi}]  fuera: {fuera:,}")

    # Valores discretos
    for col, valores in VALORES_DISCRETOS.items():
        if col not in df.columns:
            continue
        invalidos = (~df[col].isin(valores)).sum()
        total_viol += int(invalidos)
        estado = "[OK]" if invalidos == 0 else "[ALERTA]"
        lineas.append(f"  {estado} {col:<35} {sorted(valores)}  invalidos: {invalidos:,}")

    lineas.append(f"\n  Total de violaciones de rango: {total_viol:,}")
    print("\n".join(lineas))
    return lineas, total_viol


# ===========================================================================
#  FUNCION: detectar_inconsistencias
# ===========================================================================
def detectar_inconsistencias(df: pd.DataFrame) -> tuple:
    """
    Detecta inconsistencias logicas entre variables relacionadas.
    Ejemplos:
      - materias_aprobadas + materias_reprobadas > materias cursadas posibles
      - cal_min > cal_max
      - cuatrimestre 1 con historial de reprobadas

    Retorna
    -------
    (lineas: list, n_inconsistencias: int)
    """
    lineas = ["\n[INCONSISTENCIAS LOGICAS]"]
    total  = 0

    # Cal. minima no puede ser mayor que maxima
    if "calificacion_minima_parcial" in df.columns and "calificacion_maxima_parcial" in df.columns:
        inv = (df["calificacion_minima_parcial"] > df["calificacion_maxima_parcial"]).sum()
        total += int(inv)
        lineas.append(f"  cal_min > cal_max              : {inv:,}")

    # Materias reprobadas no pueden superar las materias previas esperadas
    if all(c in df.columns for c in ["materias_reprobadas", "materias_aprobadas", "cuatrimestre_actual"]):
        mat_prev = ((df["cuatrimestre_actual"] - 1) * 7).clip(lower=0)
        inv = (df["materias_reprobadas"] + df["materias_aprobadas"] > mat_prev + 1).sum()
        total += int(inv)
        lineas.append(f"  rep+apr > materias previas     : {inv:,}")

    # Materias recursadas no pueden superar reprobadas
    if all(c in df.columns for c in ["materias_recursadas", "materias_reprobadas"]):
        inv = (df["materias_recursadas"] > df["materias_reprobadas"]).sum()
        total += int(inv)
        lineas.append(f"  recursadas > reprobadas        : {inv:,}")

    # Cuatrimestre 1 con historial
    if all(c in df.columns for c in ["cuatrimestre_actual", "materias_reprobadas"]):
        inv = ((df["cuatrimestre_actual"] == 1) & (df["materias_reprobadas"] > 0)).sum()
        total += int(inv)
        lineas.append(f"  cuatrim.1 con reprobadas>0     : {inv:,}")

    if total == 0:
        lineas.append("  Sin inconsistencias detectadas.")
    else:
        lineas.append(f"\n  Total de inconsistencias: {total:,}")

    print("\n".join(lineas))
    return lineas, total


# ===========================================================================
#  FUNCION: detectar_outliers_iqr
# ===========================================================================
def detectar_outliers_iqr(df: pd.DataFrame) -> tuple:
    """
    Detecta outliers en variables numericas continuas usando el metodo IQR.
    Un valor es outlier si cae fuera de [Q1 - 1.5*IQR, Q3 + 1.5*IQR].

    Nota: los outliers NO se eliminan automaticamente porque pueden ser
    casos reales validos (el dataset es sintetico pero realista).
    Se reportan para conocimiento del analista.

    Retorna
    -------
    (lineas: list, resumen: dict)
    """
    cols_continuas = [
        "promedio_general", "promedio_actual", "asistencia_promedio",
        "parciales_reprobados", "calificacion_minima_parcial",
        "calificacion_maxima_parcial", "edad_ingreso"
    ]
    cols_presentes = [c for c in cols_continuas if c in df.columns]

    lineas  = ["\n[DETECCION DE OUTLIERS - METODO IQR]"]
    resumen = {}

    for col in cols_presentes:
        q1  = df[col].quantile(0.25)
        q3  = df[col].quantile(0.75)
        iqr = q3 - q1
        lb  = q1 - 1.5 * iqr
        ub  = q3 + 1.5 * iqr
        n_out = ((df[col] < lb) | (df[col] > ub)).sum()
        pct   = n_out / len(df) * 100
        resumen[col] = int(n_out)
        lineas.append(
            f"  {col:<35}  Q1={q1:.2f}  Q3={q3:.2f}  "
            f"IQR={iqr:.2f}  outliers={n_out:,} ({pct:.1f}%)"
        )

    total_out = sum(resumen.values())
    lineas.append(f"\n  Total de outliers detectados: {total_out:,}  (no eliminados, se reportan)")
    print("\n".join(lineas))
    return lineas, resumen


# ===========================================================================
#  FUNCION: guardar_dataset_limpio
# ===========================================================================
def guardar_dataset_limpio(df: pd.DataFrame) -> list:
    """
    Guarda el DataFrame limpio en CSV con manejo de excepciones.
    """
    lineas = ["\n[GUARDADO DEL DATASET LIMPIO]"]
    try:
        df.to_csv(RUTA_SALIDA, index=False, encoding="utf-8-sig")
        lineas.append(f"  [OK] Guardado en: {RUTA_SALIDA}")
        lineas.append(f"  Registros: {len(df):,}  |  Columnas: {df.shape[1]}")
        print(f"[OK] Dataset limpio guardado: {RUTA_SALIDA}")
    except Exception as e:
        lineas.append(f"  [ERROR] {e}")
        print(f"[ERROR] No se pudo guardar: {e}")
    return lineas


# ===========================================================================
#  FUNCION: generar_reporte_limpieza
# ===========================================================================
def generar_reporte_limpieza(secciones: list) -> None:
    """
    Consolida todas las secciones del reporte y lo guarda en un archivo TXT.
    """
    sep = "=" * 65
    encabezado = [
        sep,
        "  REPORTE DE LIMPIEZA Y VALIDACION DE DATOS",
        f"  Generado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "  Proyecto: Prediccion Desercion Escolar - Ingenieria en Software",
        sep,
    ]

    contenido = "\n".join(encabezado + secciones + ["\n" + sep])
    try:
        RUTA_REPORTE.write_text(contenido, encoding="utf-8")
        print(f"[OK] Reporte de limpieza guardado: {RUTA_REPORTE}")
    except Exception as e:
        print(f"[ERROR] No se pudo guardar el reporte: {e}")


# ===========================================================================
#  FUNCION PRINCIPAL
# ===========================================================================
def main():
    """
    Orquesta el pipeline completo de limpieza y validacion de datos.
    """
    print("\n" + "=" * 65)
    print("  SCRIPT 02 - LIMPIEZA Y VALIDACION DE DATOS")
    print("=" * 65)

    crear_directorios()
    todas_lineas = []

    # Paso 1: carga
    try:
        df = cargar_datos(RUTA_ENTRADA)
    except FileNotFoundError as e:
        print(e)
        return

    # Paso 2: informacion general
    lineas_info = mostrar_info_general(df)
    todas_lineas.extend(lineas_info)

    # Paso 3: valores faltantes
    lineas_nulos, n_nulos = detectar_valores_faltantes(df)
    todas_lineas.extend(lineas_nulos)

    # Paso 4: duplicados
    df, lineas_dup, n_dup = detectar_y_eliminar_duplicados(df)
    todas_lineas.extend(lineas_dup)

    # Paso 5: unicidad de ID
    lineas_id = validar_id_unico(df)
    todas_lineas.extend(lineas_id)

    # Paso 6: rangos validos
    lineas_rng, n_viol = verificar_rangos(df)
    todas_lineas.extend(lineas_rng)

    # Paso 7: inconsistencias logicas
    lineas_inc, n_inc = detectar_inconsistencias(df)
    todas_lineas.extend(lineas_inc)

    # Paso 8: outliers IQR
    lineas_out, resumen_out = detectar_outliers_iqr(df)
    todas_lineas.extend(lineas_out)

    # Paso 9: guardar CSV limpio
    lineas_save = guardar_dataset_limpio(df)
    todas_lineas.extend(lineas_save)

    # Paso 10: reporte
    generar_reporte_limpieza(todas_lineas)

    # Resumen final en consola
    print("\n" + "=" * 65)
    print("  RESUMEN DE LIMPIEZA")
    print("=" * 65)
    print(f"  Registros originales  : {len(df) + n_dup:,}")
    print(f"  Duplicados eliminados : {n_dup:,}")
    print(f"  Registros limpios     : {len(df):,}")
    print(f"  Valores nulos         : {n_nulos:,}")
    print(f"  Violaciones de rango  : {n_viol:,}")
    print(f"  Inconsistencias       : {n_inc:,}")
    print(f"  Outliers IQR totales  : {sum(resumen_out.values()):,} (reportados, no eliminados)")
    print("=" * 65)
    print("\n[COMPLETO] Script 02 finalizado exitosamente.\n")


# ===========================================================================
#  PUNTO DE ENTRADA
# ===========================================================================
if __name__ == "__main__":
    main()
