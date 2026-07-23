"""
===========================================================================
 SCRIPT 01 - GENERACION DE DATASET SINTETICO
 Proyecto : Prediccion de Desercion Escolar - Ingenieria en Software
 Metodo   : Simulacion por capas con relaciones causales realistas
 Salidas  : dataset_desercion_escolar.csv / .xlsx | reporte_dataset.txt
===========================================================================
 Metodologia CRISP-DM - Fase: Comprension y Preparacion de Datos
 Autor    : Data Science Project
 Python   : 3.12  |  random_state = 42
===========================================================================
"""

import sys
import io
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

# Redirigir stdout a UTF-8 para evitar errores de codificacion en Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# ===========================================================================
#  CONSTANTES GLOBALES
# ===========================================================================
SEED            = 42
N_ESTUDIANTES   = 5_000
PROP_DESERTORES = 0.18       # 18 % de desertores
PCT_OUTLIERS    = 0.05       # 5 % de casos atipicos
MAT_X_CUATRIM   = 7         # materias por cuatrimestre (1-9)
TOTAL_MATERIAS  = 64
ASIST_MIN       = 0.80       # asistencia minima reglamentaria
CAL_MIN_APR     = 7.0        # calificacion minima aprobatoria

# Rutas base del proyecto
BASE_DIR      = Path(__file__).parent
DIR_DATASET   = BASE_DIR / "dataset"
DIR_REPORTES  = BASE_DIR / "reportes"


# ===========================================================================
#  FUNCION: crear_directorios
# ===========================================================================
def crear_directorios():
    """
    Crea las carpetas necesarias del proyecto si no existen.
    Esto garantiza que el script pueda ejecutarse en cualquier maquina.
    """
    for directorio in [DIR_DATASET, DIR_REPORTES]:
        directorio.mkdir(parents=True, exist_ok=True)
    print("[OK] Directorios verificados.")


# ===========================================================================
#  FUNCION: generar_variables_base
# ===========================================================================
def generar_variables_base(rng: np.random.Generator, n: int) -> dict:
    """
    Genera las variables institucionales y sociodemograficas base.
    Estas variables no dependen de otras; son el punto de partida causal.

    Parametros
    ----------
    rng : np.random.Generator
        Generador reproducible de numeros aleatorios.
    n : int
        Numero de estudiantes a generar.

    Retorna
    -------
    dict con arrays numpy de cada variable base.
    """
    # Distribucion de cuatrimestres: piramide educativa (mas en 1ro, menos en 10mo)
    cuatrimestre = rng.choice(
        np.arange(1, 11), size=n,
        p=[0.22, 0.18, 0.15, 0.12, 0.10, 0.08, 0.06, 0.04, 0.03, 0.02]
    )

    # Variables categoricas/binarias con distribuciones reales
    beca    = rng.choice([0, 1], size=n, p=[0.70, 0.30])
    turno   = rng.choice([0, 1, 2, 3], size=n, p=[0.45, 0.30, 0.15, 0.10])
    pref    = rng.choice([0, 1, 2], size=n, p=[0.55, 0.25, 0.20])
    foraneo = rng.choice([0, 1], size=n, p=[0.65, 0.35])
    trabaja = rng.choice([0, 1], size=n, p=[0.55, 0.45])

    # Edad de ingreso: mayoria entre 17-20, cola larga hasta 35
    edad = np.clip(
        np.round(rng.beta(2.5, 6.0, n) * 18 + 17).astype(int),
        17, 35
    )

    return {
        "cuatrimestre": cuatrimestre,
        "beca"        : beca,
        "turno"       : turno,
        "pref"        : pref,
        "foraneo"     : foraneo,
        "trabaja"     : trabaja,
        "edad"        : edad,
    }


# ===========================================================================
#  FUNCION: generar_asistencia
# ===========================================================================
def generar_asistencia(rng: np.random.Generator, n: int, base: dict) -> np.ndarray:
    """
    Genera la asistencia promedio con relaciones causales realistas.

    La asistencia se modela con una distribucion Beta calibrada para
    producir una media aproximada del 88 % con la mayoria entre 82-95 %.
    Se aplican efectos acumulables pequenos por cada factor de riesgo.

    Retorna
    -------
    np.ndarray con asistencia_promedio en [0.45, 1.0]
    """
    # Distribucion base Beta(18, 2.5) -> media ~88 %
    asist = rng.beta(18.0, 2.5, n)

    # Efectos acumulables (pequenos, no deterministas)
    asist -= (base["trabaja"] == 1) * rng.uniform(0.00, 0.05, n)
    asist -= (base["foraneo"] == 1) * rng.uniform(0.00, 0.03, n)
    asist -= (base["pref"] == 2)    * rng.uniform(0.01, 0.05, n)
    asist -= (base["pref"] == 1)    * rng.uniform(0.00, 0.03, n)
    asist += (base["beca"] == 1)    * rng.uniform(0.00, 0.02, n)
    asist -= (base["turno"] >= 2)   * rng.uniform(0.00, 0.03, n)

    # Ruido moderado
    asist += rng.normal(0, 0.015, n)

    return np.clip(asist, 0.45, 1.0).round(4)


# ===========================================================================
#  FUNCION: generar_promedio
# ===========================================================================
def generar_promedio(rng: np.random.Generator, n: int,
                     asist: np.ndarray, base: dict) -> np.ndarray:
    """
    Genera el promedio actual en funcion de la asistencia y factores
    institucionales. La relacion asistencia-promedio es la principal
    cadena causal del modelo.

    La distribucion base es Beta(5.5, 2.5) escalada a [5, 10] para
    producir una media aproximada de 8.2.

    Retorna
    -------
    np.ndarray con promedio_actual en [5.0, 10.0]
    """
    # Distribucion base Beta escalada
    prom = rng.beta(5.5, 2.5, n) * 5 + 5

    # La asistencia modula el promedio (efecto central)
    prom += (asist - 0.88) * 3.5

    # Efectos institucionales adicionales
    prom += (base["beca"] == 1)    * rng.uniform(0.0, 0.4, n)
    prom -= (base["trabaja"] == 1) * rng.uniform(0.0, 0.3, n)
    prom -= (base["pref"] == 2)    * rng.uniform(0.1, 0.6, n)
    prom -= (base["pref"] == 1)    * rng.uniform(0.0, 0.3, n)

    # Ruido moderado
    prom += rng.normal(0, 0.35, n)

    return np.clip(prom, 5.0, 10.0).round(2)


# ===========================================================================
#  FUNCION: generar_materias
# ===========================================================================
def generar_materias(rng: np.random.Generator, n: int,
                     prom: np.ndarray, asist: np.ndarray,
                     cuatrimestre: np.ndarray) -> dict:
    """
    Genera todas las variables relacionadas con el historial de materias.
    Las reprobadas se modelan con Poisson (lambda bajo) para mantener
    la media entre 1-2 y menos del 8 % con mas de 4 reprobadas.

    La lambda de Poisson es una funcion exponencial invertida del promedio:
      - Promedio 10 -> lambda ~0.1 (casi no reprueba)
      - Promedio  8 -> lambda ~1.0
      - Promedio  6 -> lambda ~3.5

    Retorna
    -------
    dict con arrays de todas las variables de materias.
    """
    # Materias previas cursadas segun cuatrimestre
    mat_prev = np.where(
        cuatrimestre < 10,
        (cuatrimestre - 1) * MAT_X_CUATRIM,
        63  # Cuatrimestre 10: solo Estadias Profesionales
    ).clip(0)

    # Lambda de Poisson: funcion inversa del promedio + penalizacion por asistencia
    lam_rep = np.clip(
        np.exp(4.5 - 0.55 * prom)
        + (asist < ASIST_MIN) * 0.8
        + rng.normal(0, 0.15, n),
        0.05, 6.0
    )

    # Materias reprobadas: Poisson clampeado al maximo posible
    mat_rep = np.minimum(
        rng.poisson(lam=lam_rep),
        mat_prev
    ).astype(int)
    mat_rep[cuatrimestre == 1] = 0  # Cuatrimestre 1: sin historial previo

    # Materias aprobadas
    mat_apr = np.maximum(mat_prev - mat_rep, 0).astype(int)
    mat_apr[cuatrimestre == 1] = 0

    # Materias recursadas: fraccion Beta de las reprobadas (0.2-1.0)
    frac_rec = np.clip(rng.beta(3.5, 2.0, n), 0.2, 1.0)
    mat_rec  = np.minimum(
        np.round(mat_rep * frac_rec).astype(int),
        mat_rep
    )
    mat_rec[cuatrimestre == 1] = 0

    # Materias inscritas en el cuatrimestre actual
    mat_ins = np.where(
        cuatrimestre < 10,
        rng.integers(5, 8, n),  # Entre 5 y 7 materias
        1                        # Cuatrimestre 10: solo estadias
    ).astype(int)

    # Cuatrimestres de retraso (proporcional a reprobadas con ruido)
    retraso = np.clip(
        (mat_rep / 6.0).round().astype(int) + rng.integers(0, 2, n),
        0, 6
    ).astype(int)
    retraso[cuatrimestre == 1] = 0

    # Parciales reprobados (binomial proporcional a lambda de reprobacion)
    parc_max = np.maximum(mat_prev, 1) * 3
    p_par    = np.clip(lam_rep * 0.25, 0.01, 0.65)
    parc_rep = np.minimum(
        rng.binomial(n=parc_max.astype(int), p=p_par),
        parc_max
    ).astype(int)
    parc_rep[cuatrimestre == 1] = 0

    # Calificaciones de parciales (min/max del cuatrimestre)
    cal_min = np.clip(prom - rng.uniform(0.8, 3.5, n), 1.0, prom).round(1)
    cal_max = np.clip(prom + rng.uniform(0.3, 1.8, n), prom, 10.0).round(1)
    cal_min = np.minimum(cal_min, cal_max)

    # Promedio general historico acumulado
    prom_grl = np.clip(
        prom * 0.65 + rng.normal(prom * 0.35, 0.3, n),
        5.0, 10.0
    ).round(2)

    return {
        "mat_prev": mat_prev,
        "mat_rep" : mat_rep,
        "mat_apr" : mat_apr,
        "mat_rec" : mat_rec,
        "mat_ins" : mat_ins,
        "retraso" : retraso,
        "parc_rep": parc_rep,
        "cal_min" : cal_min,
        "cal_max" : cal_max,
        "prom_grl": prom_grl,
        "lam_rep" : lam_rep,
    }


# ===========================================================================
#  FUNCION: calcular_score_riesgo
# ===========================================================================
def calcular_score_riesgo(rng: np.random.Generator, n: int,
                           prom: np.ndarray, asist: np.ndarray,
                           materias: dict, base: dict) -> np.ndarray:
    """
    Calcula un score de riesgo de desercion en [0, 1] para cada estudiante.

    El score combina 10 factores de riesgo con pesos moderados para
    producir correlaciones en los rangos objetivo especificados.
    Se anade ruido gaussiano para evitar relaciones perfectamente lineales.

    Los pesos estan calibrados para que ninguna variable domine por
    completo la decision (objetivo: correlaciones de 0.35-0.60).

    Retorna
    -------
    np.ndarray con score en [0.0, 1.0]
    """
    risk = np.zeros(n)

    # 1. Materias reprobadas (contribucion principal)
    risk += np.where(materias["mat_rep"] >= 6, 0.20,
            np.where(materias["mat_rep"] >= 4, 0.13,
            np.where(materias["mat_rep"] >= 2, 0.07,
            np.where(materias["mat_rep"] == 1, 0.03, 0.0))))

    # 2. Materias recursadas (desgaste academico)
    risk += np.where(materias["mat_rec"] >= 5, 0.12,
            np.where(materias["mat_rec"] >= 3, 0.07,
            np.where(materias["mat_rec"] >= 1, 0.03, 0.0)))

    # 3. Parciales reprobados
    risk += np.where(materias["parc_rep"] >= 20, 0.12,
            np.where(materias["parc_rep"] >= 10, 0.07,
            np.where(materias["parc_rep"] >=  5, 0.04, 0.0)))

    # 4. Retraso academico (fuerte senial de abandono)
    risk += np.where(materias["retraso"] >= 3, 0.14,
            np.where(materias["retraso"] == 2, 0.09,
            np.where(materias["retraso"] == 1, 0.04, 0.0)))

    # 5. Promedio bajo (efecto moderado)
    risk += np.where(prom < 6.5, 0.14,
            np.where(prom < 7.5, 0.08,
            np.where(prom < 8.5, 0.03, 0.0)))

    # 6. Asistencia baja
    risk += np.where(asist < 0.72, 0.13,
            np.where(asist < 0.82, 0.07,
            np.where(asist < 0.88, 0.02, 0.0)))

    # 7. Preferencia de carrera (factor motivacional)
    risk += np.where(base["pref"] == 2, 0.07,
            np.where(base["pref"] == 1, 0.03, 0.0))

    # 8. Beca (factor protector)
    risk -= (base["beca"] == 1) * 0.06

    # 9. Trabaja (penalizacion leve)
    risk += (base["trabaja"] == 1) * rng.uniform(0.0, 0.04, n)

    # 10. Foraneo (influencia minima, no determinante)
    risk += (base["foraneo"] == 1) * rng.uniform(0.0, 0.025, n)

    # Ruido personal no observable (salud, economia, familia, etc.)
    risk += rng.normal(0, 0.06, n)

    return np.clip(risk, 0.0, 1.0)


# ===========================================================================
#  FUNCION: asignar_desercion
# ===========================================================================
def asignar_desercion(risk: np.ndarray, n: int,
                       prop_desertores: float = 0.18) -> np.ndarray:
    """
    Convierte el score de riesgo en la variable binaria de desercion.

    Estrategia: seleccionar los N estudiantes con mayor score como
    desertores, garantizando exactamente la proporcion objetivo.
    El orden por score preserva la relacion causal sin usar un umbral fijo.

    Parametros
    ----------
    risk             : array de scores de riesgo [0, 1]
    n                : numero de estudiantes
    prop_desertores  : proporcion objetivo de desertores

    Retorna
    -------
    np.ndarray binario (0=activo, 1=desertor)
    """
    n_target  = int(n * prop_desertores)
    orden     = np.argsort(risk)[::-1]
    desercion = np.zeros(n, dtype=int)
    desercion[orden[:n_target]] = 1
    return desercion


# ===========================================================================
#  FUNCION: inyectar_outliers
# ===========================================================================
def inyectar_outliers(desercion: np.ndarray, prom: np.ndarray,
                       asist: np.ndarray, mat_rep: np.ndarray,
                       rng: np.random.Generator,
                       pct: float = 0.05) -> np.ndarray:
    """
    Inyecta casos atipicos realistas (~5 % del dataset).

    Los outliers reducen las correlaciones a rangos moderados y añaden
    realismo: no todos los buenos estudiantes continuan ni todos los
    malos estudiantes desertan.

    Tipos de outliers:
      A - Buen promedio (>=8.5) que deserta  (motivos personales/economicos)
      B - Bajo promedio (<=7.0) que continua (perseverancia)
      C - Baja asistencia (<80%) + pocas reprobadas, no deserta
      D - Muchas reprobadas (>=4) y continua (alta resiliencia)

    Retorna
    -------
    np.ndarray desercion modificado
    """
    d = desercion.copy()
    n_out = max(int(len(d) * pct) // 4, 1)

    # Tipo A: buen promedio que deserta
    cand_a = np.where((prom >= 8.5) & (d == 0))[0]
    if len(cand_a) >= n_out:
        d[rng.choice(cand_a, n_out, replace=False)] = 1

    # Tipo B: bajo promedio que continua
    cand_b = np.where((prom <= 7.0) & (d == 1))[0]
    if len(cand_b) >= n_out:
        d[rng.choice(cand_b, n_out, replace=False)] = 0

    # Tipo C: baja asistencia pero pocas reprobadas, no deserta
    cand_c = np.where((asist < 0.80) & (mat_rep <= 1) & (d == 1))[0]
    if len(cand_c) >= n_out // 2:
        d[rng.choice(cand_c, n_out // 2, replace=False)] = 0

    # Tipo D: muchas reprobadas pero continua (resiliente / recursa todo)
    cand_d = np.where((mat_rep >= 4) & (d == 1))[0]
    if len(cand_d) >= n_out // 2:
        d[rng.choice(cand_d, n_out // 2, replace=False)] = 0

    return d


# ===========================================================================
#  FUNCION: construir_dataframe
# ===========================================================================
def construir_dataframe(base: dict, prom_grl: np.ndarray, prom: np.ndarray,
                         asist: np.ndarray, materias: dict,
                         desercion: np.ndarray, n: int,
                         rng: np.random.Generator) -> pd.DataFrame:
    """
    Ensambla el DataFrame final con todos los datos del dataset.
    Genera IDs unicos con formato ISW-YYYY-NNNNN.

    Retorna
    -------
    pd.DataFrame con 20 columnas y N filas.
    """
    # Generacion de IDs unicos por estudiante
    anos   = [2018 + int(rng.integers(0, 8)) for _ in range(n)]
    ids    = [f"ISW-{anos[i]}-{str(i + 1).zfill(5)}" for i in range(n)]

    df = pd.DataFrame({
        "id_estudiante"              : ids,
        "promedio_general"           : prom_grl,
        "promedio_actual"            : prom,
        "asistencia_promedio"        : asist,
        "materias_reprobadas"        : materias["mat_rep"],
        "materias_recursadas"        : materias["mat_rec"],
        "materias_inscritas"         : materias["mat_ins"],
        "materias_aprobadas"         : materias["mat_apr"],
        "cuatrimestre_actual"        : base["cuatrimestre"],
        "cuatrimestres_retraso"      : materias["retraso"],
        "parciales_reprobados"       : materias["parc_rep"],
        "calificacion_minima_parcial": materias["cal_min"],
        "calificacion_maxima_parcial": materias["cal_max"],
        "beneficiario_beca"          : base["beca"],
        "turno"                      : base["turno"],
        "preferencia_carrera"        : base["pref"],
        "foraneo"                    : base["foraneo"],
        "trabaja"                    : base["trabaja"],
        "edad_ingreso"               : base["edad"],
        "desercion"                  : desercion,
    })
    return df


# ===========================================================================
#  FUNCION: guardar_dataset
# ===========================================================================
def guardar_dataset(df: pd.DataFrame) -> None:
    """
    Guarda el DataFrame en formato CSV y XLSX con manejo de excepciones.
    """
    ruta_csv  = DIR_DATASET / "dataset_desercion_escolar.csv"
    ruta_xlsx = DIR_DATASET / "dataset_desercion_escolar.xlsx"

    try:
        df.to_csv(ruta_csv, index=False, encoding="utf-8-sig")
        print(f"[OK] CSV  guardado: {ruta_csv}")
    except Exception as e:
        print(f"[ERROR] No se pudo guardar el CSV: {e}")

    try:
        df.to_excel(ruta_xlsx, index=False, engine="openpyxl")
        print(f"[OK] XLSX guardado: {ruta_xlsx}")
    except Exception as e:
        print(f"[ERROR] No se pudo guardar el XLSX: {e}")


# ===========================================================================
#  FUNCION: generar_reporte
# ===========================================================================
def generar_reporte(df: pd.DataFrame) -> None:
    """
    Genera un reporte textual con estadisticas del dataset generado.
    Incluye: distribucion de clases, correlaciones con la variable
    objetivo, distribuciones clave y validaciones de calidad.
    """
    ruta_rep = DIR_REPORTES / "reporte_dataset.txt"
    n        = len(df)

    num_cols = [c for c in df.columns if c not in ["id_estudiante", "desercion"]]
    corr     = df[num_cols + ["desercion"]].corr(numeric_only=True)["desercion"].drop("desercion")

    lineas = []
    sep    = "=" * 65
    sep2   = "-" * 65

    lineas.append(sep)
    lineas.append("  REPORTE DE DATASET - DESERCION ESCOLAR")
    lineas.append(f"  Generado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lineas.append("  Carrera: Ingenieria en Software | 5,000 estudiantes")
    lineas.append(sep)

    # Distribucion de clases
    vc = df["desercion"].value_counts().sort_index()
    lineas.append("\n[1] DISTRIBUCION DE CLASES")
    lineas.append(sep2)
    lineas.append(f"  Activos    (0): {vc.get(0, 0):,}  ({vc.get(0, 0)/n:.1%})")
    lineas.append(f"  Desertores (1): {vc.get(1, 0):,}  ({vc.get(1, 0)/n:.1%})")

    # Estadisticas descriptivas
    lineas.append("\n[2] ESTADISTICAS DESCRIPTIVAS")
    lineas.append(sep2)
    desc = df[num_cols].describe().T[["mean", "std", "min", "50%", "max"]]
    desc.columns = ["media", "std", "min", "mediana", "max"]
    lineas.append(desc.round(3).to_string())

    # Correlaciones con desercion
    lineas.append("\n[3] CORRELACIONES CON desercion")
    lineas.append(sep2)
    lineas.append(f"  {'Variable':<35} {'Corr':>8}")
    lineas.append(f"  {'-'*35} {'-'*8}")
    for var, val in corr.sort_values().items():
        lineas.append(f"  {var:<35} {val:>+8.4f}")

    # Distribucion de materias reprobadas
    lineas.append("\n[4] DISTRIBUCION DE MATERIAS REPROBADAS")
    lineas.append(sep2)
    for k in [0, 1, 2, 3, 4, "5+"]:
        if k == "5+":
            cnt = (df["materias_reprobadas"] >= 5).sum()
        else:
            cnt = (df["materias_reprobadas"] == k).sum()
        lineas.append(f"  {str(k):>4}: {cnt:5,}  ({cnt/n:.1%})")
    pct4 = (df["materias_reprobadas"] > 4).mean()
    lineas.append(f"  Media: {df['materias_reprobadas'].mean():.2f}  |  >4 reprobadas: {pct4:.1%}  (obj.<8%)")

    # Distribucion del promedio actual
    lineas.append("\n[5] DISTRIBUCION DEL PROMEDIO ACTUAL")
    lineas.append(sep2)
    for lb, ub, lbl in [(5, 6, "5-6"), (6, 7, "6-7"), (7, 8, "7-8"),
                         (8, 9, "8-9"), (9, 10.01, "9-10")]:
        cnt = ((df["promedio_actual"] >= lb) & (df["promedio_actual"] < ub)).sum()
        lineas.append(f"  {lbl:>6}: {cnt:5,}  ({cnt/n:.1%})")
    lineas.append(f"  Media: {df['promedio_actual'].mean():.2f}  |  Std: {df['promedio_actual'].std():.2f}")

    # Distribucion de asistencia
    lineas.append("\n[6] DISTRIBUCION DE ASISTENCIA PROMEDIO")
    lineas.append(sep2)
    for lb, ub, lbl in [(0, 0.70, "<70%"), (0.70, 0.80, "70-80%"),
                          (0.80, 0.85, "80-85%"), (0.85, 0.90, "85-90%"),
                          (0.90, 0.95, "90-95%"), (0.95, 1.01, "95-100%")]:
        cnt = ((df["asistencia_promedio"] >= lb) & (df["asistencia_promedio"] < ub)).sum()
        lineas.append(f"  {lbl:>9}: {cnt:5,}  ({cnt/n:.1%})")
    lineas.append(f"  Media: {df['asistencia_promedio'].mean():.2%}  |  Mediana: {df['asistencia_promedio'].median():.2%}")

    # Validaciones de calidad
    lineas.append("\n[7] VALIDACIONES DE CALIDAD")
    lineas.append(sep2)
    lineas.append(f"  Duplicados            : {df.duplicated().sum()}")
    lineas.append(f"  Valores nulos         : {df.isnull().sum().sum()}")
    lineas.append(f"  IDs unicos            : {df['id_estudiante'].nunique()}")
    lineas.append(f"  Promedios fuera [5,10]: {((df['promedio_actual']<5)|(df['promedio_actual']>10)).sum()}")
    lineas.append(f"  Asistencia fuera [0,1]: {((df['asistencia_promedio']<0)|(df['asistencia_promedio']>1)).sum()}")
    lineas.append(f"  Reprobadas > previas  : {(df['materias_reprobadas'] > df['materias_aprobadas'] + df['materias_reprobadas']).sum()}")
    lineas.append(sep)

    contenido = "\n".join(lineas)

    try:
        ruta_rep.write_text(contenido, encoding="utf-8")
        print(f"[OK] Reporte guardado: {ruta_rep}")
    except Exception as e:
        print(f"[ERROR] No se pudo guardar el reporte: {e}")


# ===========================================================================
#  FUNCION PRINCIPAL
# ===========================================================================
def main():
    """
    Orquesta la generacion completa del dataset sintetico.
    Ejecuta todas las etapas en orden causal.
    """
    print("\n" + "=" * 65)
    print("  SCRIPT 01 - GENERACION DE DATASET SINTETICO")
    print("  Ingenieria en Software | Random Forest Project")
    print("=" * 65)

    # Paso 0: preparacion
    crear_directorios()
    rng = np.random.default_rng(SEED)
    n   = N_ESTUDIANTES

    # Paso 1: variables base (institucionales y sociodemograficas)
    print("\n[1/7] Generando variables institucionales y sociodemograficas...")
    base = generar_variables_base(rng, n)

    # Paso 2: asistencia promedio
    print("[2/7] Generando asistencia promedio...")
    asist = generar_asistencia(rng, n, base)

    # Paso 3: promedio actual
    print("[3/7] Generando promedio actual...")
    prom = generar_promedio(rng, n, asist, base)

    # Paso 4: historial de materias
    print("[4/7] Generando historial de materias...")
    materias = generar_materias(rng, n, prom, asist, base["cuatrimestre"])

    # Paso 5: score de riesgo y variable objetivo
    print("[5/7] Calculando score de riesgo y variable desercion...")
    risk     = calcular_score_riesgo(rng, n, prom, asist, materias, base)
    desercion = asignar_desercion(risk, n, PROP_DESERTORES)

    # Paso 6: inyeccion de outliers
    print(f"[6/7] Inyectando {PCT_OUTLIERS:.0%} de casos atipicos...")
    desercion = inyectar_outliers(
        desercion, prom, asist,
        materias["mat_rep"], rng, PCT_OUTLIERS
    )

    # Paso 7: ensamblado del DataFrame
    print("[7/7] Construyendo DataFrame final...")
    df = construir_dataframe(
        base, materias["prom_grl"], prom, asist, materias, desercion, n, rng
    )

    # Guardar archivos
    print("\nGuardando archivos...")
    guardar_dataset(df)
    generar_reporte(df)

    # Resumen final
    vc    = df["desercion"].value_counts().sort_index()
    tasa  = vc.get(1, 0) / n
    print("\n" + "=" * 65)
    print("  RESUMEN FINAL")
    print("=" * 65)
    print(f"  Registros generados : {n:,}")
    print(f"  Activos  (0)        : {vc.get(0,0):,}  ({vc.get(0,0)/n:.1%})")
    print(f"  Desertores (1)      : {vc.get(1,0):,}  ({tasa:.1%})")
    print(f"  Promedio medio      : {df['promedio_actual'].mean():.2f}")
    print(f"  Asistencia media    : {df['asistencia_promedio'].mean():.2%}")
    print(f"  Mat. reprobadas med : {df['materias_reprobadas'].mean():.2f}")
    print(f"  >4 reprobadas       : {(df['materias_reprobadas']>4).mean():.1%}")
    print("=" * 65)
    print("\n[COMPLETO] Script 01 finalizado exitosamente.\n")


# ===========================================================================
#  PUNTO DE ENTRADA
# ===========================================================================
if __name__ == "__main__":
    main()
