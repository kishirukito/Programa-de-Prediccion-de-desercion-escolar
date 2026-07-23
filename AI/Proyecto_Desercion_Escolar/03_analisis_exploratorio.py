"""
===========================================================================
 SCRIPT 03 - ANALISIS EXPLORATORIO DE DATOS (EDA)
 Proyecto : Prediccion de Desercion Escolar - Ingenieria en Software
 Entrada  : dataset/dataset_limpio.csv
 Salidas  : 12 graficas PNG en graficas/
===========================================================================
 Metodologia CRISP-DM - Fase: Comprension de Datos
 Python   : 3.12
===========================================================================
"""

import sys
import io
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")   # Backend sin GUI para guardar PNG directamente
import matplotlib.pyplot as plt
import matplotlib.ticker as mtick
import seaborn as sns
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# ===========================================================================
#  RUTAS
# ===========================================================================
BASE_DIR    = Path(__file__).parent
DIR_DATASET = BASE_DIR / "dataset"
DIR_GRAFICAS = BASE_DIR / "graficas"
RUTA_DATOS  = DIR_DATASET / "dataset_limpio.csv"

# ===========================================================================
#  PALETA Y ESTILO GLOBAL
# ===========================================================================
PALETA       = ["#2ecc71", "#e74c3c"]     # Verde=activo, Rojo=desertor
COLOR_PPAL   = "#2c3e50"
COLOR_ACENTO = "#3498db"
COLOR_AVISO  = "#e74c3c"
FIGSIZE_STD  = (10, 6)
FIGSIZE_HEAT = (14, 10)
DPI          = 120


def aplicar_estilo():
    """Aplica el estilo global de Seaborn para todas las graficas."""
    sns.set_theme(style="whitegrid", palette="muted")
    plt.rcParams.update({
        "figure.dpi"         : DPI,
        "font.family"        : "DejaVu Sans",
        "axes.titlesize"     : 14,
        "axes.titleweight"   : "bold",
        "axes.labelsize"     : 11,
        "xtick.labelsize"    : 9,
        "ytick.labelsize"    : 9,
        "legend.fontsize"    : 10,
        "figure.facecolor"   : "white",
    })


# ===========================================================================
#  FUNCION: crear_directorios
# ===========================================================================
def crear_directorios():
    """Crea los directorios de salida si no existen."""
    for d in [DIR_DATASET, DIR_GRAFICAS]:
        d.mkdir(parents=True, exist_ok=True)


# ===========================================================================
#  FUNCION: cargar_datos
# ===========================================================================
def cargar_datos() -> pd.DataFrame:
    """Carga el dataset limpio desde CSV."""
    if not RUTA_DATOS.exists():
        raise FileNotFoundError(
            f"[ERROR] No se encontro: {RUTA_DATOS}\n"
            "Ejecuta primero 01_generar_dataset.py y 02_limpieza_datos.py"
        )
    df = pd.read_csv(RUTA_DATOS, encoding="utf-8-sig")
    print(f"[OK] Dataset cargado: {len(df):,} registros")
    return df


# ===========================================================================
#  FUNCION: guardar_figura
# ===========================================================================
def guardar_figura(nombre: str) -> None:
    """Guarda la figura actual en graficas/ y cierra el plot."""
    ruta = DIR_GRAFICAS / nombre
    try:
        plt.tight_layout()
        plt.savefig(ruta, dpi=DPI, bbox_inches="tight", facecolor="white")
        plt.close()
        print(f"  [OK] {nombre}")
    except Exception as e:
        print(f"  [ERROR] {nombre}: {e}")
        plt.close()


# ===========================================================================
#  GRAFICA 1: Distribucion de clases
# ===========================================================================
def grafica_distribucion_clases(df: pd.DataFrame) -> None:
    """Grafica de barras con la proporcion de activos vs desertores."""
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    fig.suptitle("Distribucion de la Variable Objetivo: Desercion", fontsize=15, fontweight="bold")

    vc     = df["desercion"].value_counts().sort_index()
    labels = ["Activo (0)", "Desertor (1)"]

    # Grafica de barras
    bars = axes[0].bar(labels, vc.values, color=PALETA, edgecolor="white", linewidth=1.5, width=0.5)
    axes[0].set_title("Cantidad de estudiantes")
    axes[0].set_ylabel("Numero de estudiantes")
    for bar, val in zip(bars, vc.values):
        axes[0].text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 20,
                     f"{val:,}", ha="center", va="bottom", fontweight="bold")

    # Grafica de pastel
    axes[1].pie(
        vc.values, labels=labels, colors=PALETA, autopct="%1.1f%%",
        startangle=90, pctdistance=0.80,
        wedgeprops={"edgecolor": "white", "linewidth": 2}
    )
    axes[1].set_title("Proporcion")

    guardar_figura("distribucion_clases.png")


# ===========================================================================
#  GRAFICA 2: Histograma de promedio actual
# ===========================================================================
def grafica_histograma_promedio(df: pd.DataFrame) -> None:
    """Histograma del promedio actual separado por clase."""
    fig, ax = plt.subplots(figsize=FIGSIZE_STD)

    for val, lbl, color in zip([0, 1], ["Activo", "Desertor"], PALETA):
        subset = df[df["desercion"] == val]["promedio_actual"]
        ax.hist(subset, bins=30, alpha=0.7, label=lbl, color=color, edgecolor="white")

    ax.axvline(df["promedio_actual"].mean(), color=COLOR_PPAL, linestyle="--", lw=1.5,
               label=f"Media: {df['promedio_actual'].mean():.2f}")
    ax.set_title("Distribucion del Promedio Actual por Clase")
    ax.set_xlabel("Promedio Actual")
    ax.set_ylabel("Frecuencia")
    ax.legend()
    guardar_figura("histograma_promedio.png")


# ===========================================================================
#  GRAFICA 3: Histograma de asistencia
# ===========================================================================
def grafica_histograma_asistencia(df: pd.DataFrame) -> None:
    """Histograma de asistencia promedio separado por clase."""
    fig, ax = plt.subplots(figsize=FIGSIZE_STD)

    for val, lbl, color in zip([0, 1], ["Activo", "Desertor"], PALETA):
        subset = df[df["desercion"] == val]["asistencia_promedio"] * 100
        ax.hist(subset, bins=30, alpha=0.7, label=lbl, color=color, edgecolor="white")

    media_asist = df["asistencia_promedio"].mean() * 100
    ax.axvline(media_asist, color=COLOR_PPAL, linestyle="--", lw=1.5,
               label=f"Media: {media_asist:.1f}%")
    ax.axvline(80, color="orange", linestyle=":", lw=1.5, label="Minimo reglamentario (80%)")
    ax.set_title("Distribucion de Asistencia Promedio por Clase")
    ax.set_xlabel("Asistencia (%)")
    ax.set_ylabel("Frecuencia")
    ax.xaxis.set_major_formatter(mtick.FormatStrFormatter("%.0f%%"))
    ax.legend()
    guardar_figura("histograma_asistencia.png")


# ===========================================================================
#  GRAFICA 4: Distribucion de materias reprobadas
# ===========================================================================
def grafica_dist_reprobadas(df: pd.DataFrame) -> None:
    """Grafica de barras con la distribucion de materias reprobadas."""
    fig, ax = plt.subplots(figsize=FIGSIZE_STD)

    max_rep   = min(df["materias_reprobadas"].max(), 12)
    bins      = list(range(0, int(max_rep) + 2))
    conteos   = df["materias_reprobadas"].value_counts().sort_index()
    x_vals    = conteos.index[:max_rep + 1]
    y_vals    = conteos.values[:max_rep + 1]

    bars = ax.bar(x_vals, y_vals, color=COLOR_ACENTO, edgecolor="white", linewidth=1)
    for bar in bars:
        if bar.get_height() > 0:
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 5,
                    f"{int(bar.get_height()):,}", ha="center", va="bottom", fontsize=8)

    ax.axvline(df["materias_reprobadas"].mean(), color=COLOR_AVISO, linestyle="--", lw=1.5,
               label=f"Media: {df['materias_reprobadas'].mean():.2f}")
    ax.set_title("Distribucion de Materias Reprobadas")
    ax.set_xlabel("Numero de materias reprobadas")
    ax.set_ylabel("Numero de estudiantes")
    ax.set_xticks(range(0, int(max_rep) + 1))
    ax.legend()
    guardar_figura("dist_materias_reprobadas.png")


# ===========================================================================
#  GRAFICA 5: Distribucion de materias recursadas
# ===========================================================================
def grafica_dist_recursadas(df: pd.DataFrame) -> None:
    """Grafica de barras con la distribucion de materias recursadas."""
    fig, ax = plt.subplots(figsize=FIGSIZE_STD)

    max_rec = min(df["materias_recursadas"].max(), 10)
    conteos = df["materias_recursadas"].value_counts().sort_index()
    x_vals  = conteos.index[conteos.index <= max_rec]
    y_vals  = conteos[x_vals].values

    ax.bar(x_vals, y_vals, color="#9b59b6", edgecolor="white", linewidth=1)
    ax.axvline(df["materias_recursadas"].mean(), color=COLOR_AVISO, linestyle="--", lw=1.5,
               label=f"Media: {df['materias_recursadas'].mean():.2f}")
    ax.set_title("Distribucion de Materias Recursadas (Vueltas a Tomar)")
    ax.set_xlabel("Numero de materias recursadas")
    ax.set_ylabel("Numero de estudiantes")
    ax.legend()
    guardar_figura("dist_materias_recursadas.png")


# ===========================================================================
#  GRAFICA 6: Distribucion de cuatrimestres de retraso
# ===========================================================================
def grafica_dist_retraso(df: pd.DataFrame) -> None:
    """Grafica de barras con la distribucion de cuatrimestres de retraso."""
    fig, ax = plt.subplots(figsize=FIGSIZE_STD)

    conteos = df["cuatrimestres_retraso"].value_counts().sort_index()
    colores = sns.color_palette("YlOrRd", n_colors=len(conteos))
    bars    = ax.bar(conteos.index, conteos.values, color=colores, edgecolor="white")

    for bar, val in zip(bars, conteos.values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 10,
                f"{val:,}", ha="center", va="bottom", fontsize=8)

    ax.set_title("Distribucion de Cuatrimestres de Retraso")
    ax.set_xlabel("Cuatrimestres de retraso")
    ax.set_ylabel("Numero de estudiantes")
    ax.set_xticks(conteos.index)
    guardar_figura("dist_cuatrimestres_retraso.png")


# ===========================================================================
#  GRAFICA 7: Boxplot de promedio por clase
# ===========================================================================
def grafica_boxplot_promedio(df: pd.DataFrame) -> None:
    """Boxplot comparativo del promedio actual entre activos y desertores."""
    fig, ax = plt.subplots(figsize=(8, 6))
    df_plot = df.copy()
    df_plot["Clase"] = df_plot["desercion"].map({0: "Activo", 1: "Desertor"})

    sns.boxplot(data=df_plot, x="Clase", y="promedio_actual",
                hue="Clase", palette={"Activo": PALETA[0], "Desertor": PALETA[1]},
                width=0.45, ax=ax, order=["Activo", "Desertor"], legend=False)
    sns.stripplot(data=df_plot, x="Clase", y="promedio_actual",
                  hue="Clase", palette={"Activo": PALETA[0], "Desertor": PALETA[1]},
                  order=["Activo", "Desertor"],
                  alpha=0.2, size=2, jitter=True, ax=ax, legend=False)

    ax.set_title("Promedio Actual por Clase de Desercion")
    ax.set_xlabel("Clase")
    ax.set_ylabel("Promedio Actual")
    guardar_figura("boxplot_promedio.png")


# ===========================================================================
#  GRAFICA 8: Boxplot de asistencia por clase
# ===========================================================================
def grafica_boxplot_asistencia(df: pd.DataFrame) -> None:
    """Boxplot comparativo de asistencia promedio entre clases."""
    fig, ax = plt.subplots(figsize=(8, 6))
    df_plot = df.copy()
    df_plot["Clase"] = df_plot["desercion"].map({0: "Activo", 1: "Desertor"})
    df_plot["asistencia_pct"] = df_plot["asistencia_promedio"] * 100

    sns.boxplot(data=df_plot, x="Clase", y="asistencia_pct",
                hue="Clase", palette={"Activo": PALETA[0], "Desertor": PALETA[1]},
                width=0.45, ax=ax, order=["Activo", "Desertor"], legend=False)
    ax.axhline(80, color="orange", linestyle="--", lw=1.5, label="Minimo 80%")
    ax.set_title("Asistencia Promedio por Clase de Desercion")
    ax.set_xlabel("Clase")
    ax.set_ylabel("Asistencia (%)")
    ax.yaxis.set_major_formatter(mtick.FormatStrFormatter("%.0f%%"))
    ax.legend()
    guardar_figura("boxplot_asistencia.png")


# ===========================================================================
#  GRAFICA 9: Boxplot de materias reprobadas por clase
# ===========================================================================
def grafica_boxplot_reprobadas(df: pd.DataFrame) -> None:
    """Boxplot comparativo de materias reprobadas entre clases."""
    fig, ax = plt.subplots(figsize=(8, 6))
    df_plot = df.copy()
    df_plot["Clase"] = df_plot["desercion"].map({0: "Activo", 1: "Desertor"})

    sns.boxplot(data=df_plot, x="Clase", y="materias_reprobadas",
                hue="Clase", palette={"Activo": PALETA[0], "Desertor": PALETA[1]},
                width=0.45, ax=ax, order=["Activo", "Desertor"], legend=False)
    ax.axhline(3, color="orange", linestyle="--", lw=1.5, label="Riesgo expulsion (>3)")
    ax.set_title("Materias Reprobadas por Clase de Desercion")
    ax.set_xlabel("Clase")
    ax.set_ylabel("Materias reprobadas")
    ax.legend()
    guardar_figura("boxplot_reprobadas.png")


# ===========================================================================
#  GRAFICA 10: Heatmap de correlaciones
# ===========================================================================
def grafica_heatmap_correlaciones(df: pd.DataFrame) -> None:
    """Mapa de calor de la matriz de correlaciones entre todas las variables numericas."""
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    corr_mat = df[num_cols].corr()

    fig, ax = plt.subplots(figsize=FIGSIZE_HEAT)
    mask = np.triu(np.ones_like(corr_mat, dtype=bool))   # Solo triangulo inferior

    sns.heatmap(
        corr_mat, mask=mask, annot=True, fmt=".2f",
        cmap="RdYlGn", center=0, vmin=-1, vmax=1,
        linewidths=0.5, ax=ax,
        annot_kws={"size": 7}
    )
    ax.set_title("Matriz de Correlaciones - Variables Numericas", pad=15)
    ax.tick_params(axis="x", rotation=45)
    ax.tick_params(axis="y", rotation=0)
    guardar_figura("heatmap_correlaciones.png")


# ===========================================================================
#  GRAFICA 11: Mapa de valores faltantes
# ===========================================================================
def grafica_mapa_faltantes(df: pd.DataFrame) -> None:
    """Visualizacion de valores faltantes (missingno-style con seaborn)."""
    fig, ax = plt.subplots(figsize=(12, 5))

    nulos  = df.isnull().sum()
    total  = len(df)
    pcts   = (nulos / total * 100).sort_values(ascending=False)

    colores = ["#e74c3c" if v > 0 else "#2ecc71" for v in pcts.values]
    bars = ax.bar(pcts.index, pcts.values, color=colores, edgecolor="white")

    for bar, val in zip(bars, pcts.values):
        ax.text(bar.get_x() + bar.get_width() / 2,
                bar.get_height() + 0.01,
                f"{val:.1f}%", ha="center", va="bottom", fontsize=8)

    ax.set_title("Porcentaje de Valores Faltantes por Variable")
    ax.set_ylabel("% de valores faltantes")
    ax.set_ylim(0, max(pcts.max() + 2, 5))
    ax.tick_params(axis="x", rotation=45)

    if nulos.sum() == 0:
        ax.text(0.5, 0.5, "Sin valores faltantes",
                transform=ax.transAxes, fontsize=18,
                ha="center", va="center", color="#2ecc71", fontweight="bold")

    guardar_figura("mapa_valores_faltantes.png")


# ===========================================================================
#  GRAFICA 12: Correlacion de cada variable contra desercion
# ===========================================================================
def grafica_correlacion_vs_desercion(df: pd.DataFrame) -> None:
    """
    Grafica de barras horizontales con la correlacion de Pearson de cada
    variable numerica contra la variable objetivo (desercion).
    """
    num_cols = [c for c in df.select_dtypes(include=[np.number]).columns
                if c != "desercion"]
    corr_vals = df[num_cols].corrwith(df["desercion"]).sort_values()

    colores = [COLOR_AVISO if v > 0 else "#3498db" for v in corr_vals.values]

    fig, ax = plt.subplots(figsize=(10, 8))
    bars = ax.barh(corr_vals.index, corr_vals.values, color=colores, edgecolor="white")

    ax.axvline(0, color="black", linewidth=0.8)
    for bar, val in zip(bars, corr_vals.values):
        offset = 0.005 if val >= 0 else -0.005
        ha     = "left"  if val >= 0 else "right"
        ax.text(val + offset, bar.get_y() + bar.get_height() / 2,
                f"{val:+.3f}", ha=ha, va="center", fontsize=8)

    ax.set_title("Correlacion de cada Variable con la Desercion", fontsize=14)
    ax.set_xlabel("Correlacion de Pearson")
    ax.set_xlim(corr_vals.min() - 0.08, corr_vals.max() + 0.08)
    guardar_figura("correlacion_vs_desercion.png")


# ===========================================================================
#  FUNCION PRINCIPAL
# ===========================================================================
def main():
    """
    Orquesta la generacion de las 12 graficas del analisis exploratorio.
    """
    print("\n" + "=" * 65)
    print("  SCRIPT 03 - ANALISIS EXPLORATORIO DE DATOS (EDA)")
    print("=" * 65)

    crear_directorios()
    aplicar_estilo()

    try:
        df = cargar_datos()
    except FileNotFoundError as e:
        print(e)
        return

    print("\nGenerando graficas...\n")

    graficas = [
        ("1/12", "Distribucion de clases",          grafica_distribucion_clases),
        ("2/12", "Histograma de promedio",           grafica_histograma_promedio),
        ("3/12", "Histograma de asistencia",         grafica_histograma_asistencia),
        ("4/12", "Dist. materias reprobadas",        grafica_dist_reprobadas),
        ("5/12", "Dist. materias recursadas",        grafica_dist_recursadas),
        ("6/12", "Dist. cuatrimestres de retraso",   grafica_dist_retraso),
        ("7/12", "Boxplot promedio",                 grafica_boxplot_promedio),
        ("8/12", "Boxplot asistencia",               grafica_boxplot_asistencia),
        ("9/12", "Boxplot materias reprobadas",      grafica_boxplot_reprobadas),
        ("10/12","Heatmap de correlaciones",         grafica_heatmap_correlaciones),
        ("11/12","Mapa de valores faltantes",        grafica_mapa_faltantes),
        ("12/12","Correlacion vs desercion",         grafica_correlacion_vs_desercion),
    ]

    for num, nombre, funcion in graficas:
        print(f"  [{num}] {nombre}...")
        try:
            funcion(df)
        except Exception as e:
            print(f"    [ERROR] {e}")

    print("\n" + "=" * 65)
    print(f"  12 graficas guardadas en: {DIR_GRAFICAS}")
    print("=" * 65)
    print("\n[COMPLETO] Script 03 finalizado exitosamente.\n")


# ===========================================================================
#  PUNTO DE ENTRADA
# ===========================================================================
if __name__ == "__main__":
    main()
