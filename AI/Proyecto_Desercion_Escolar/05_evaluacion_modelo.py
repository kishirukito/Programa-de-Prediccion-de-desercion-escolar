"""
===========================================================================
 SCRIPT 05 - EVALUACION DEL MODELO RANDOM FOREST
 Proyecto : Prediccion de Desercion Escolar - Ingenieria en Software
 Entrada  : modelos/random_forest.pkl
 Salidas  : 4 graficas PNG en graficas/ | reportes/metricas_modelo.txt
===========================================================================
 Metodologia CRISP-DM - Fase: Evaluacion
 IMPORTANTE: Solo se usa el conjunto de prueba (NUNCA el de entrenamiento)
 Python    : 3.12
===========================================================================
"""

import sys
import io
import numpy as np
import pandas as pd
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from datetime import datetime
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, classification_report,
    confusion_matrix, roc_curve, precision_recall_curve,
    average_precision_score
)

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# ===========================================================================
#  RUTAS
# ===========================================================================
BASE_DIR     = Path(__file__).parent
DIR_MODELOS  = BASE_DIR / "modelos"
DIR_GRAFICAS = BASE_DIR / "graficas"
DIR_REPORTES = BASE_DIR / "reportes"
RUTA_MODELO  = DIR_MODELOS / "random_forest.pkl"
RUTA_METRICAS = DIR_REPORTES / "metricas_modelo.txt"

# Estilo global
DPI = 120
PALETA_CONF = ["#2ecc71", "#e74c3c"]
COLOR_ROC   = "#3498db"
COLOR_PR    = "#9b59b6"

def aplicar_estilo():
    sns.set_theme(style="whitegrid")
    plt.rcParams.update({
        "figure.dpi"     : DPI,
        "font.family"    : "DejaVu Sans",
        "axes.titlesize" : 14,
        "axes.titleweight": "bold",
        "axes.labelsize" : 11,
        "figure.facecolor": "white",
    })


# ===========================================================================
#  FUNCION: crear_directorios
# ===========================================================================
def crear_directorios():
    """Crea los directorios de salida si no existen."""
    for d in [DIR_MODELOS, DIR_GRAFICAS, DIR_REPORTES]:
        d.mkdir(parents=True, exist_ok=True)


# ===========================================================================
#  FUNCION: cargar_modelo
# ===========================================================================
def cargar_modelo() -> dict:
    """
    Carga el modelo y los datos de prueba desde el archivo PKL.

    Retorna
    -------
    dict con modelo, X_test, y_test, features, params, val_metrics, timestamp.

    Lanza
    -----
    FileNotFoundError si el archivo no existe.
    """
    if not RUTA_MODELO.exists():
        raise FileNotFoundError(
            f"[ERROR] No se encontro el modelo: {RUTA_MODELO}\n"
            "Ejecuta primero el script 04_entrenamiento_random_forest.py"
        )
    payload = joblib.load(RUTA_MODELO)
    print(f"[OK] Modelo cargado desde: {RUTA_MODELO}")
    print(f"     Entrenado el: {payload.get('timestamp', 'N/D')[:19]}")
    return payload


# ===========================================================================
#  FUNCION: calcular_metricas
# ===========================================================================
def calcular_metricas(modelo, X_test: pd.DataFrame,
                       y_test: pd.Series) -> dict:
    """
    Calcula todas las metricas de evaluacion sobre el conjunto de prueba.

    Metricas calculadas:
      - Accuracy, Precision, Recall, F1-score, ROC-AUC
      - Matriz de confusion
      - Classification Report completo

    Parametros
    ----------
    modelo : RandomForestClassifier entrenado
    X_test : pd.DataFrame con features de prueba
    y_test : pd.Series con etiquetas reales de prueba

    Retorna
    -------
    dict con todas las metricas.
    """
    y_pred = modelo.predict(X_test)
    y_prob = modelo.predict_proba(X_test)[:, 1]

    metricas = {
        "accuracy"  : accuracy_score(y_test, y_pred),
        "precision" : precision_score(y_test, y_pred, zero_division=0),
        "recall"    : recall_score(y_test, y_pred, zero_division=0),
        "f1"        : f1_score(y_test, y_pred, zero_division=0),
        "roc_auc"   : roc_auc_score(y_test, y_prob),
        "avg_prec"  : average_precision_score(y_test, y_prob),
        "y_pred"    : y_pred,
        "y_prob"    : y_prob,
        "conf_mat"  : confusion_matrix(y_test, y_pred),
        "report"    : classification_report(y_test, y_pred,
                                            target_names=["Activo", "Desertor"],
                                            zero_division=0),
    }

    # Curvas
    metricas["fpr"], metricas["tpr"], metricas["roc_thresh"] = roc_curve(y_test, y_prob)
    metricas["prec_curva"], metricas["recall_curva"], metricas["pr_thresh"] = precision_recall_curve(y_test, y_prob)

    print("\n[METRICAS - CONJUNTO DE PRUEBA]")
    print(f"  Accuracy  : {metricas['accuracy']:.4f}")
    print(f"  Precision : {metricas['precision']:.4f}")
    print(f"  Recall    : {metricas['recall']:.4f}")
    print(f"  F1-Score  : {metricas['f1']:.4f}")
    print(f"  ROC-AUC   : {metricas['roc_auc']:.4f}")
    print(f"  Avg Prec  : {metricas['avg_prec']:.4f}")

    return metricas


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
#  GRAFICA 1: Matriz de confusion
# ===========================================================================
def grafica_matriz_confusion(metricas: dict, y_test: pd.Series) -> None:
    """
    Genera un heatmap de la matriz de confusion con valores absolutos
    y porcentajes por fila (precision por clase).
    """
    cm = metricas["conf_mat"]
    cm_pct = cm.astype(float) / cm.sum(axis=1, keepdims=True) * 100

    fig, ax = plt.subplots(figsize=(8, 6))
    labels  = ["Activo (0)", "Desertor (1)"]

    sns.heatmap(
        cm, annot=False, fmt="d", cmap="Blues",
        xticklabels=labels, yticklabels=labels,
        linewidths=1, linecolor="white", ax=ax
    )

    # Anotar con valor absoluto y porcentaje
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j + 0.5, i + 0.4,
                    f"{cm[i, j]:,}",
                    ha="center", va="center",
                    fontsize=16, fontweight="bold",
                    color="white" if cm[i, j] > cm.max() * 0.5 else "black")
            ax.text(j + 0.5, i + 0.65,
                    f"({cm_pct[i, j]:.1f}%)",
                    ha="center", va="center",
                    fontsize=10,
                    color="white" if cm[i, j] > cm.max() * 0.5 else "black")

    ax.set_title(
        f"Matriz de Confusion\n"
        f"Accuracy: {metricas['accuracy']:.4f}  |  F1: {metricas['f1']:.4f}",
        pad=15
    )
    ax.set_ylabel("Clase Real")
    ax.set_xlabel("Clase Predicha")
    guardar_figura("matriz_confusion.png")


# ===========================================================================
#  GRAFICA 2: Curva ROC
# ===========================================================================
def grafica_curva_roc(metricas: dict) -> None:
    """
    Curva ROC con area bajo la curva (AUC) y linea de referencia aleatoria.
    """
    fig, ax = plt.subplots(figsize=(8, 7))

    ax.plot(
        metricas["fpr"], metricas["tpr"],
        color=COLOR_ROC, lw=2.5,
        label=f"ROC Curve (AUC = {metricas['roc_auc']:.4f})"
    )
    ax.fill_between(metricas["fpr"], metricas["tpr"], alpha=0.15, color=COLOR_ROC)
    ax.plot([0, 1], [0, 1], "k--", lw=1, label="Clasificador aleatorio (AUC=0.50)")

    # Punto optimo (maximo J de Youden)
    j_scores = metricas["tpr"] - metricas["fpr"]
    idx_opt  = np.argmax(j_scores)
    ax.scatter(
        metricas["fpr"][idx_opt], metricas["tpr"][idx_opt],
        color="red", s=80, zorder=5,
        label=f"Umbral optimo = {metricas['roc_thresh'][idx_opt]:.2f}"
    )

    ax.set_title("Curva ROC - Random Forest\nPrediccion de Desercion Escolar")
    ax.set_xlabel("Tasa de Falsos Positivos (1 - Especificidad)")
    ax.set_ylabel("Tasa de Verdaderos Positivos (Sensibilidad)")
    ax.legend(loc="lower right")
    ax.set_xlim([-0.02, 1.02])
    ax.set_ylim([-0.02, 1.05])

    # Grid sutil
    ax.grid(True, alpha=0.3)
    guardar_figura("roc_curve.png")


# ===========================================================================
#  GRAFICA 3: Curva Precision-Recall
# ===========================================================================
def grafica_precision_recall(metricas: dict) -> None:
    """
    Curva Precision-Recall con Average Precision (AP).
    Util especialmente cuando existe desbalance de clases.
    """
    fig, ax = plt.subplots(figsize=(8, 7))

    ax.plot(
        metricas["recall_curva"], metricas["prec_curva"],
        color=COLOR_PR, lw=2.5,
        label=f"Precision-Recall (AP = {metricas['avg_prec']:.4f})"
    )
    ax.fill_between(metricas["recall_curva"], metricas["prec_curva"],
                    alpha=0.15, color=COLOR_PR)

    # Linea base (proporcion de la clase positiva)
    baseline = metricas["conf_mat"].sum(axis=1)[1] / metricas["conf_mat"].sum()
    ax.axhline(y=baseline, color="gray", linestyle="--", lw=1.2,
               label=f"Baseline (proporcion clase 1 = {baseline:.2f})")

    ax.set_title("Curva Precision-Recall - Random Forest\nPrediccion de Desercion Escolar")
    ax.set_xlabel("Recall (Sensibilidad)")
    ax.set_ylabel("Precision")
    ax.legend(loc="upper right")
    ax.set_xlim([-0.02, 1.02])
    ax.set_ylim([0.0, 1.05])
    ax.grid(True, alpha=0.3)
    guardar_figura("precision_recall.png")


# ===========================================================================
#  GRAFICA 4: Importancia de variables
# ===========================================================================
def grafica_importancia_variables(modelo, nombres_features: list) -> None:
    """
    Grafica de barras horizontales con la importancia de cada variable
    del modelo Random Forest, ordenadas de mayor a menor.
    """
    importancias = modelo.feature_importances_
    df_imp = pd.DataFrame({
        "variable"   : nombres_features,
        "importancia": importancias,
    }).sort_values("importancia", ascending=True)

    n     = len(df_imp)
    paleta = sns.color_palette("Blues_r", n_colors=n)[::-1]

    fig, ax = plt.subplots(figsize=(10, max(6, n * 0.4)))
    bars = ax.barh(
        df_imp["variable"], df_imp["importancia"],
        color=paleta, edgecolor="white", linewidth=0.5
    )

    for bar, val in zip(bars, df_imp["importancia"]):
        ax.text(val + 0.001, bar.get_y() + bar.get_height() / 2,
                f"{val:.4f}", va="center", fontsize=8)

    ax.set_title("Importancia de Variables - Random Forest")
    ax.set_xlabel("Importancia (Mean Decrease in Impurity)")
    ax.set_xlim(0, df_imp["importancia"].max() * 1.15)
    ax.grid(axis="x", alpha=0.3)
    guardar_figura("importancia_variables.png")


# ===========================================================================
#  FUNCION: guardar_reporte_metricas
# ===========================================================================
def guardar_reporte_metricas(metricas: dict, payload: dict,
                              y_test: pd.Series) -> None:
    """
    Genera y guarda un reporte textual completo con todas las metricas
    de evaluacion del modelo sobre el conjunto de prueba.
    """
    sep  = "=" * 65
    sep2 = "-" * 65
    val  = payload.get("val_metrics", {})

    lineas = [
        sep,
        "  REPORTE DE EVALUACION - MODELO RANDOM FOREST",
        f"  Generado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "  Proyecto: Prediccion Desercion Escolar - Ingenieria en Software",
        sep,
        "",
        "[1] HIPERPARAMETROS DEL MODELO",
        sep2,
    ]
    for param, val_param in payload.get("params", {}).items():
        lineas.append(f"  {param:<25} = {val_param}")

    lineas += [
        "",
        "[2] METRICAS EN VALIDACION (referencia, no para publicar)",
        sep2,
        f"  Accuracy  : {val.get('accuracy', 0):.4f}",
        f"  Precision : {val.get('precision', 0):.4f}",
        f"  Recall    : {val.get('recall', 0):.4f}",
        f"  F1-Score  : {val.get('f1', 0):.4f}",
        f"  ROC-AUC   : {val.get('roc_auc', 0):.4f}",
        "",
        "[3] METRICAS EN PRUEBA (resultado oficial)",
        sep2,
        f"  Registros en prueba : {len(y_test):,}",
        f"  Activos reales      : {(y_test==0).sum():,}",
        f"  Desertores reales   : {(y_test==1).sum():,}",
        "",
        f"  Accuracy            : {metricas['accuracy']:.4f}",
        f"  Precision           : {metricas['precision']:.4f}",
        f"  Recall              : {metricas['recall']:.4f}",
        f"  F1-Score            : {metricas['f1']:.4f}",
        f"  ROC-AUC             : {metricas['roc_auc']:.4f}",
        f"  Average Precision   : {metricas['avg_prec']:.4f}",
        "",
        "[4] REPORTE DE CLASIFICACION COMPLETO",
        sep2,
        metricas["report"],
        "",
        "[5] MATRIZ DE CONFUSION",
        sep2,
    ]

    cm = metricas["conf_mat"]
    lineas.append(f"  {'':25} Predicho_Activo  Predicho_Desertor")
    lineas.append(f"  {'Real_Activo':<25} {cm[0,0]:>15,}  {cm[0,1]:>17,}")
    lineas.append(f"  {'Real_Desertor':<25} {cm[1,0]:>15,}  {cm[1,1]:>17,}")

    lineas += [
        "",
        "[6] GRAFICAS GENERADAS",
        sep2,
        "  graficas/matriz_confusion.png",
        "  graficas/roc_curve.png",
        "  graficas/precision_recall.png",
        "  graficas/importancia_variables.png",
        "",
        sep,
    ]

    contenido = "\n".join(lineas)
    try:
        RUTA_METRICAS.write_text(contenido, encoding="utf-8")
        print(f"\n[OK] Reporte de metricas guardado: {RUTA_METRICAS}")
    except Exception as e:
        print(f"\n[ERROR] No se pudo guardar el reporte: {e}")


# ===========================================================================
#  FUNCION PRINCIPAL
# ===========================================================================
def main():
    """
    Orquesta la evaluacion completa del modelo Random Forest entrenado.
    """
    print("\n" + "=" * 65)
    print("  SCRIPT 05 - EVALUACION DEL MODELO RANDOM FOREST")
    print("  Solo se usa el conjunto de prueba (test set)")
    print("=" * 65)

    crear_directorios()
    aplicar_estilo()

    # Paso 1: cargar modelo
    print("\n[1/5] Cargando modelo entrenado...")
    try:
        payload = cargar_modelo()
    except FileNotFoundError as e:
        print(e)
        return

    modelo          = payload["modelo"]
    X_test          = payload["X_test"]
    y_test          = payload["y_test"]
    nombres_features = payload["features"]

    # Paso 2: calcular metricas
    print("\n[2/5] Calculando metricas sobre conjunto de prueba...")
    metricas = calcular_metricas(modelo, X_test, y_test)

    print("\n--- Classification Report ---")
    print(metricas["report"])

    print("--- Matriz de Confusion ---")
    cm = metricas["conf_mat"]
    print(f"  VN={cm[0,0]:,}  FP={cm[0,1]:,}")
    print(f"  FN={cm[1,0]:,}  VP={cm[1,1]:,}")

    # Paso 3: generar graficas
    print("\n[3/5] Generando graficas de evaluacion...")
    grafica_matriz_confusion(metricas, y_test)
    grafica_curva_roc(metricas)
    grafica_precision_recall(metricas)
    grafica_importancia_variables(modelo, nombres_features)

    # Paso 4: guardar reporte
    print("\n[4/5] Guardando reporte de metricas...")
    guardar_reporte_metricas(metricas, payload, y_test)

    # Paso 5: resumen final
    print("\n[5/5] Resumen final:")
    print("\n" + "=" * 65)
    print("  EVALUACION FINAL - CONJUNTO DE PRUEBA")
    print("=" * 65)
    print(f"  Accuracy  : {metricas['accuracy']:.4f}")
    print(f"  Precision : {metricas['precision']:.4f}")
    print(f"  Recall    : {metricas['recall']:.4f}")
    print(f"  F1-Score  : {metricas['f1']:.4f}")
    print(f"  ROC-AUC   : {metricas['roc_auc']:.4f}")
    print("=" * 65)
    print("\n[COMPLETO] Script 05 finalizado exitosamente.\n")


# ===========================================================================
#  PUNTO DE ENTRADA
# ===========================================================================
if __name__ == "__main__":
    main()
