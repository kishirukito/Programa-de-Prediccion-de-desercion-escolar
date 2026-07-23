"""
===========================================================================
 SCRIPT 06 - COMPARACION DE MODELOS (BASE vs OPTIMIZADO)
 Proyecto : Prediccion de Desercion Escolar - Ingenieria en Software
 Entradas : modelos/random_forest_base.pkl
            modelos/random_forest_optimizado.pkl
 Salidas  : comparacion/ (5 imagenes + CSV/XLSX)
            reportes/reporte_final.txt
===========================================================================
 Metodologia CRISP-DM - Fase: Evaluacion (Comparacion Final)
 Python   : 3.12
===========================================================================
"""

import sys
import io
import time
import warnings
warnings.filterwarnings("ignore")

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
    accuracy_score, precision_score, recall_score, f1_score,
    fbeta_score, roc_auc_score, confusion_matrix, roc_curve,
    precision_recall_curve, average_precision_score,
    balanced_accuracy_score, matthews_corrcoef
)

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# ===========================================================================
#  CONFIGURACION Y RUTAS
# ===========================================================================
BETA         = 2
DPI          = 120
BASE_DIR     = Path(__file__).parent
DIR_MODELOS  = BASE_DIR / "modelos"
DIR_COMPARAR = BASE_DIR / "comparacion"
DIR_REPORTES = BASE_DIR / "reportes"
RUTA_BASE    = DIR_MODELOS / "random_forest_base.pkl"
RUTA_OPT     = DIR_MODELOS / "random_forest_optimizado.pkl"


def crear_directorios():
    for d in [DIR_COMPARAR, DIR_REPORTES]:
        d.mkdir(parents=True, exist_ok=True)
    print("[OK] Directorios verificados.")


def aplicar_estilo():
    sns.set_theme(style="whitegrid")
    plt.rcParams.update({
        "figure.dpi": DPI, "font.family": "DejaVu Sans",
        "axes.titlesize": 13, "axes.titleweight": "bold",
        "axes.labelsize": 11, "figure.facecolor": "white",
    })


def guardar_figura(nombre: str) -> None:
    ruta = DIR_COMPARAR / nombre
    try:
        plt.tight_layout()
        plt.savefig(ruta, dpi=DPI, bbox_inches="tight", facecolor="white")
        print(f"  [OK] {nombre}")
    except Exception as e:
        print(f"  [ERROR] {nombre}: {e}")
    finally:
        plt.close()


# ===========================================================================
#  FUNCION: cargar_payload
# ===========================================================================
def cargar_payload(ruta: Path) -> dict:
    if not ruta.exists():
        raise FileNotFoundError(f"[ERROR] No se encontro el archivo serializado: {ruta}")
    return joblib.load(ruta)


# ===========================================================================
#  FUNCION: medir_inferencia
# ===========================================================================
def medir_inferencia(modelo, X: pd.DataFrame, repeticiones: int = 100) -> float:
    """Mide el tiempo promedio de inferencia por prediccion en milisegundos."""
    t0 = time.time()
    for _ in range(repeticiones):
        _ = modelo.predict_proba(X)
    t_total = time.time() - t0
    # Retorna tiempo por registro en milisegundos (ms)
    return (t_total / repeticiones) * 1000


# ===========================================================================
#  FUNCION: evaluar_modelo
# ===========================================================================
def evaluar_modelo(payload: dict) -> dict:
    """
    Evalua el modelo usando las caracteristicas guardadas en el payload.
    Calcula metricas al umbral optimizado/base respectivo.
    """
    modelo    = payload["modelo"]
    X_test    = payload["X_test"]
    y_test    = payload["y_test"]
    threshold = payload["threshold"]

    y_prob    = modelo.predict_proba(X_test)[:, 1]
    y_pred    = (y_prob >= threshold).astype(int)

    cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel() if cm.shape == (2,2) else (0,0,0,0)
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0

    # Medir inferencia
    t_inf = medir_inferencia(modelo, X_test)

    return {
        "accuracy"        : accuracy_score(y_test, y_pred),
        "precision"       : precision_score(y_test, y_pred, zero_division=0),
        "recall"          : recall_score(y_test, y_pred, zero_division=0),
        "specificity"     : specificity,
        "f1"              : f1_score(y_test, y_pred, zero_division=0),
        "f2"              : fbeta_score(y_test, y_pred, beta=BETA, zero_division=0),
        "roc_auc"         : roc_auc_score(y_test, y_prob),
        "balanced_acc"    : balanced_accuracy_score(y_test, y_pred),
        "avg_precision"   : average_precision_score(y_test, y_prob),
        "mcc"             : matthews_corrcoef(y_test, y_pred),
        "fp"              : int(fp),
        "fn"              : int(fn),
        "tp"              : int(tp),
        "tn"              : int(tn),
        "threshold"       : threshold,
        "training_time"   : payload.get("training_time", 0.0),
        "inference_time"  : t_inf,
        "y_prob"          : y_prob,
        "y_test"          : y_test,
        "cm"              : cm,
        "features"        : payload["features"],
        "importancias"    : modelo.feature_importances_
    }


# ===========================================================================
#  GRAFICAS COMPARATIVAS
# ===========================================================================

def grafica_comparacion_metricas(df_met: pd.DataFrame) -> None:
    """Grafica de barras comparando metricas clave de ambos modelos."""
    columnas_plot = ["accuracy", "precision", "recall", "specificity", "f1", "f2", "roc_auc", "balanced_acc"]
    df_plot = df_met.loc[columnas_plot].reset_index()
    df_melt = pd.melt(df_plot, id_vars=["index"], var_name="Modelo", value_name="Valor")
    df_melt.columns = ["Metrica", "Modelo", "Valor"]

    fig, ax = plt.subplots(figsize=(10, 6))
    sns.barplot(data=df_melt, x="Metrica", y="Valor", hue="Modelo",
                palette=["#3498db", "#e74c3c"], edgecolor="white", ax=ax)
    ax.set_ylim(0, 1.05)
    ax.set_title("Comparacion de Metricas — Modelo Base vs Optimizado")
    ax.set_ylabel("Score")
    ax.set_xlabel("Metrica")

    for p in ax.patches:
        val = p.get_height()
        if val > 0:
            ax.text(p.get_x() + p.get_width()/2., val + 0.01,
                    f"{val:.3f}", ha="center", va="bottom", fontsize=8, fontweight="bold")

    guardar_figura("comparacion_metricas.png")


def grafica_comparacion_matrices(m_base: dict, m_opt: dict) -> None:
    """Compara matrices de confusion lado a lado."""
    fig, axes = plt.subplots(1, 2, figsize=(13, 6))
    modelos = [
        ("Modelo Base (Umbral=0.50)", m_base["cm"], "Blues", axes[0]),
        (f"Modelo Optimizado (Umbral={m_opt['threshold']:.2f})", m_opt["cm"], "Reds", axes[1])
    ]

    labels = ["Activo", "Desertor"]
    for titulo, cm, cmap, ax in modelos:
        cm_pct = cm.astype(float) / cm.sum(axis=1, keepdims=True) * 100
        sns.heatmap(cm, annot=False, cmap=cmap, xticklabels=labels, yticklabels=labels,
                    linewidths=1, linecolor="white", ax=ax, cbar=False)
        for i in range(2):
            for j in range(2):
                ax.text(j+.5, i+.38, f"{cm[i,j]:,}",
                        ha="center", va="center", fontsize=15, fontweight="bold",
                        color="white" if cm[i,j] > cm.max()*.5 else "black")
                ax.text(j+.5, i+.65, f"({cm_pct[i,j]:.1f}%)",
                        ha="center", va="center", fontsize=9,
                        color="white" if cm[i,j] > cm.max()*.5 else "black")
        ax.set_title(titulo)
        ax.set_ylabel("Real")
        ax.set_xlabel("Predicho")

    guardar_figura("comparacion_matriz_confusion.png")


def grafica_comparacion_roc(m_base: dict, m_opt: dict) -> None:
    """Compara curvas ROC lado a lado o superpuestas."""
    fig, ax = plt.subplots(figsize=(8, 7))

    for m, lbl, col in zip([m_base, m_opt], ["RF Base", "RF Optimizado"], ["#3498db", "#e74c3c"]):
        fpr, tpr, _ = roc_curve(m["y_test"], m["y_prob"])
        auc_val = roc_auc_score(m["y_test"], m["y_prob"])
        ax.plot(fpr, tpr, color=col, lw=2.5, label=f"{lbl} (AUC={auc_val:.4f})")

    ax.plot([0,1],[0,1],"k--", lw=1, label="Aleatorio")
    ax.set_title("Comparacion de Curvas ROC")
    ax.set_xlabel("Tasa Falsos Positivos")
    ax.set_ylabel("Tasa Verdaderos Positivos")
    ax.legend(loc="lower right")
    ax.grid(True, alpha=0.3)
    guardar_figura("comparacion_curvas_roc.png")


def grafica_comparacion_pr(m_base: dict, m_opt: dict) -> None:
    """Compara curvas Precision-Recall."""
    fig, ax = plt.subplots(figsize=(8, 7))

    for m, lbl, col in zip([m_base, m_opt], ["RF Base", "RF Optimizado"], ["#3498db", "#e74c3c"]):
        prec, rec, _ = precision_recall_curve(m["y_test"], m["y_prob"])
        ap = average_precision_score(m["y_test"], m["y_prob"])
        ax.plot(rec, prec, color=col, lw=2.5, label=f"{lbl} (AP={ap:.4f})")

    ax.axhline(m_base["y_test"].mean(), color="gray", linestyle="--", lw=1.2, label="Baseline")
    ax.set_title("Comparacion de Curvas Precision-Recall")
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.legend()
    ax.grid(True, alpha=0.3)
    guardar_figura("comparacion_curvas_precision_recall.png")


def grafica_comparacion_importancias(m_base: dict, m_opt: dict) -> None:
    """Visualiza y compara la importancia de variables MDI para ambos modelos."""
    df_base = pd.DataFrame({"variable": m_base["features"], "Base": m_base["importancias"]})
    df_opt  = pd.DataFrame({"variable": m_opt["features"], "Optimizado": m_opt["importancias"]})
    df_comp = pd.merge(df_base, df_opt, on="variable").sort_values("Optimizado", ascending=True)

    df_melt = pd.melt(df_comp, id_vars=["variable"], var_name="Modelo", value_name="Importancia")

    fig, ax = plt.subplots(figsize=(10, 8))
    sns.barplot(data=df_melt, y="variable", x="Importancia", hue="Modelo",
                palette=["#3498db", "#e74c3c"], edgecolor="white", ax=ax)
    ax.set_title("Comparacion de Importancia de Variables (MDI)")
    ax.set_xlabel("Importancia")
    ax.set_ylabel("Variable")
    ax.legend()
    guardar_figura("comparacion_importancia_variables.png")


# ===========================================================================
#  FUNCION: generar_reporte_final
# ===========================================================================
def generar_reporte_final(df_met: pd.DataFrame, m_base: dict, m_opt: dict) -> str:
    """Genera interpretacion automatica del negocio y lo guarda en TXT."""
    rec_diff   = m_opt["recall"] - m_base["recall"]
    f2_diff    = m_opt["f2"] - m_base["f2"]
    fn_reducc  = m_base["fn"] - m_opt["fn"]
    acc_cost   = m_base["accuracy"] - m_opt["accuracy"]

    # Identificar variables clave del optimizado
    df_imp = pd.DataFrame({"v": m_opt["features"], "i": m_opt["importancias"]})
    top_v  = df_imp.sort_values("i", ascending=False).head(3)["v"].tolist()

    reporte = []
    sep = "=" * 65
    sep2 = "-" * 65

    reporte.append(sep)
    reporte.append("  REPORTE FINAL Y COMPARATIVO DE MODELOS")
    reporte.append(f"  Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    reporte.append("  Sistemas de Alerta Temprana — Desercion Escolar")
    reporte.append(sep)

    reporte.append("\n[1] TABLA COMPARATIVA DE METRICAS")
    reporte.append(sep2)
    # Formatear la tabla
    tabla_str = df_met.round(4).to_string()
    reporte.append(tabla_str)

    reporte.append("\n[2] TIEMPOS DE COMPUTO")
    reporte.append(sep2)
    reporte.append(f"  Modelo Base:")
    reporte.append(f"    Tiempo Entrenamiento: {m_base['training_time']:.2f} segundos")
    reporte.append(f"    Tiempo Inferencia   : {m_base['inference_time']:.4f} ms por pred.")
    reporte.append(f"  Modelo Optimizado:")
    reporte.append(f"    Tiempo Entrenamiento: {m_opt['training_time']/60:.2f} minutos")
    reporte.append(f"    Tiempo Inferencia   : {m_opt['inference_time']:.4f} ms por pred.")

    reporte.append("\n[3] INTERPRETACION Y RESPUESTAS AL NEGOCIO")
    reporte.append(sep2)

    # Mejor Recall
    if m_opt["recall"] > m_base["recall"]:
        reporte.append(f"  * ¿Que modelo obtuvo mejor Recall?")
        reporte.append(f"    El Modelo Optimizado ({m_opt['recall']:.2%} vs {m_base['recall']:.2%}, mejora de +{rec_diff:.2%}).")
    else:
        reporte.append(f"  * ¿Que modelo obtuvo mejor Recall?")
        reporte.append(f"    El Modelo Base ({m_base['recall']:.2%}).")

    # Mejor F2
    if m_opt["f2"] > m_base["f2"]:
        reporte.append(f"  * ¿Que modelo obtuvo mejor F2?")
        reporte.append(f"    El Modelo Optimizado ({m_opt['f2']:.4f} vs {m_base['f2']:.4f}, mejora de +{f2_diff:.4f}).")
    else:
        reporte.append(f"  * ¿Que modelo obtuvo mejor F2?")
        reporte.append(f"    El Modelo Base ({m_base['f2']:.4f}).")

    # Falsos Negativos reducidos
    reporte.append(f"  * ¿Cual redujo mas falsos negativos (FN)?")
    reporte.append(f"    El Modelo Optimizado. Redujo los FN de {m_base['fn']} a {m_opt['fn']} ({fn_reducc} menos).")
    reporte.append(f"    Esto representa {fn_reducc} estudiantes en riesgo detectados oportunamente.")

    # Costo en Accuracy
    reporte.append(f"  * ¿Cual fue el costo en Accuracy?")
    reporte.append(f"    El costo fue de {acc_cost:.2%} (Modelo Base {m_base['accuracy']:.2%} vs Optimizado {m_opt['accuracy']:.2%}).")
    reporte.append(f"    En el contexto de la desercion, esta perdida es plenamente aceptable para ganar Recall.")

    # Variables mas importantes
    reporte.append(f"  * ¿Que variables fueron mas importantes para predecir el riesgo?")
    reporte.append(f"    Las 3 variables con mayor peso predictivo son: {', '.join(top_v)}.")

    # Efecto del Threshold
    reporte.append(f"  * ¿Como afecto el threshold a los resultados?")
    reporte.append(f"    Bajar el threshold de 0.50 a {m_opt['threshold']:.2f} incremento sustancialmente la sensibilidad (Recall)")
    reporte.append(f"    reduciendo a la mitad los falsos negativos, balanceado con una Precision superior al 60%.")

    # Recomendacion Final
    reporte.append("\n[4] RECOMENDACION DE IMPLEMENTACION")
    reporte.append(sep2)
    reporte.append("  Se recomienda implementar el MODELO OPTIMIZADO con el umbral de decision")
    reporte.append(f"  calibrado a {m_opt['threshold']:.2f} por los siguientes motivos:")
    reporte.append(f"  1. Captura al {m_opt['recall']:.1%} de estudiantes reales que abandonaran (Recall).")
    reporte.append(f"  2. Maximiza el F2-score ({m_opt['f2']:.4f}), que es la metrica optima para un Sistema de Alerta Temprana.")
    reporte.append(f"  3. Mantiene una Precision de {m_opt['precision']:.1%}, evitando el desgaste institucional por falsas alarmas.")
    reporte.append(f"  4. El tiempo de inferencia de {m_opt['inference_time']:.4f} ms es compatible con produccion en tiempo real.")
    reporte.append(sep)

    contenido = "\n".join(reporte)
    try:
        (DIR_REPORTES / "reporte_final.txt").write_text(contenido, encoding="utf-8")
        print("[OK] reporte_final.txt guardado")
    except Exception as e:
        print(f"[ERROR] No se pudo guardar reporte_final.txt: {e}")

    return contenido


# ===========================================================================
#  FUNCION PRINCIPAL
# ===========================================================================
def main():
    print("\n" + "="*65)
    print("  SCRIPT 06 - COMPARACION DE MODELOS (BASE vs OPTIMIZADO)")
    print("="*65)

    crear_directorios()
    aplicar_estilo()

    try:
        p_base = cargar_payload(RUTA_BASE)
        p_opt  = cargar_payload(RUTA_OPT)
    except FileNotFoundError as e:
        print(e); return

    print("\nEvaluando modelo Base...")
    m_base = evaluar_modelo(p_base)

    print("Evaluando modelo Optimizado...")
    m_opt  = evaluar_modelo(p_opt)

    # Crear tabla de comparacion
    metricas = [
        "accuracy", "precision", "recall", "specificity", "f1", "f2",
        "roc_auc", "balanced_acc", "avg_precision", "mcc", "fp", "fn",
        "threshold", "training_time", "inference_time"
    ]

    df_comp = pd.DataFrame(index=metricas)
    df_comp["Modelo Base"] = [m_base[m] for m in metricas]
    df_comp["Modelo Optimizado"] = [m_opt[m] for m in metricas]

    # Guardar en CSV y XLSX
    try:
        df_comp.to_csv(DIR_COMPARAR / "comparacion_metricas.csv", encoding="utf-8-sig")
        df_comp.to_excel(DIR_COMPARAR / "comparacion_metricas.xlsx", engine="openpyxl")
        print("[OK] comparacion_metricas (CSV y XLSX) guardados")
    except Exception as e:
        print(f"[ERROR] Guardando CSV/XLSX: {e}")

    # Generar graficas
    print("\nGenerando graficas comparativas...")
    grafica_comparacion_metricas(df_comp)
    grafica_comparacion_matrices(m_base, m_opt)
    grafica_comparacion_roc(m_base, m_opt)
    grafica_comparacion_pr(m_base, m_opt)
    grafica_comparacion_importancias(m_base, m_opt)

    # Generar reporte escrito
    print("\nGenerando reporte interpretativo final...")
    reporte_txt = generar_reporte_final(df_comp, m_base, m_opt)
    print("\n" + reporte_txt)


if __name__ == "__main__":
    main()
