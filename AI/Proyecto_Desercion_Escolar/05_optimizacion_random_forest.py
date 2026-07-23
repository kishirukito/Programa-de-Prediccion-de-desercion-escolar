"""
===========================================================================
 SCRIPT 05 - OPTIMIZACION DEL MODELO RANDOM FOREST
 Proyecto : Prediccion de Desercion Escolar - Ingenieria en Software
 Entrada  : dataset/dataset_limpio.csv
 Salidas  : modelos/random_forest_optimizado.pkl
            resultados/modelo_optimizado/ (12 graficas + CSV/XLSX)
===========================================================================
 Metodologia CRISP-DM - Fase: Modelado (Optimizacion)
 Objetivo : Maximizar Recall/F2-Score para deteccion de riesgo temprano
 Busqueda : GridSearchCV 2 fases | scorer = fbeta_score(beta=2)
 Python   : 3.12  |  random_state = 42
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
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import (
    train_test_split, GridSearchCV, StratifiedKFold, cross_val_score
)
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    fbeta_score, roc_auc_score, confusion_matrix, roc_curve,
    precision_recall_curve, average_precision_score,
    balanced_accuracy_score, matthews_corrcoef
)
from sklearn.calibration import calibration_curve
from sklearn.inspection import permutation_importance
from sklearn.metrics import make_scorer

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# ===========================================================================
#  CONFIGURACION GLOBAL
# ===========================================================================
RANDOM_STATE  = 42
DPI           = 120
BETA          = 2                       # fbeta_score beta
COL_EXCLUIR   = ["id_estudiante", "desercion"]
THRESHOLDS    = [0.50, 0.45, 0.40, 0.35, 0.30, 0.25]

CLASS_WEIGHTS = [
    None,
    "balanced",
    {0: 1, 1: 2},
    {0: 1, 1: 3},
    {0: 1, 1: 4},
]

# Param grid para la busqueda de hiperparametros
PARAM_GRID_OPT = {
    "n_estimators"     : [100, 200, 300, 500],
    "max_depth"        : [10, 20, 30, 40, None],
    "min_samples_split": [2, 5, 10, 15],
    "min_samples_leaf" : [1, 2, 4, 6],
    "max_features"     : ["sqrt", "log2", None],
    "criterion"        : ["gini", "entropy", "log_loss"],
}

# ===========================================================================
#  RUTAS
# ===========================================================================
BASE_DIR            = Path(__file__).parent
DIR_DATASET         = BASE_DIR / "dataset"
DIR_MODELOS         = BASE_DIR / "modelos"
DIR_REPORTES        = BASE_DIR / "reportes"
DIR_RESULTADOS_OPT  = BASE_DIR / "resultados" / "modelo_optimizado"
RUTA_DATOS          = DIR_DATASET / "dataset_limpio.csv"
RUTA_MODELO_OPT     = DIR_MODELOS / "random_forest_optimizado.pkl"


# ===========================================================================
#  FUNCION: crear_directorios
# ===========================================================================
def crear_directorios():
    """Crea todos los directorios necesarios si no existen."""
    for d in [DIR_DATASET, DIR_MODELOS, DIR_REPORTES, DIR_RESULTADOS_OPT]:
        d.mkdir(parents=True, exist_ok=True)
    print("[OK] Directorios verificados.")


# ===========================================================================
#  FUNCION: aplicar_estilo
# ===========================================================================
def aplicar_estilo():
    """Aplica estilo global uniforme a todas las graficas."""
    sns.set_theme(style="whitegrid")
    plt.rcParams.update({
        "figure.dpi": DPI, "font.family": "DejaVu Sans",
        "axes.titlesize": 13, "axes.titleweight": "bold",
        "axes.labelsize": 11, "figure.facecolor": "white",
    })


# ===========================================================================
#  FUNCION: guardar_figura
# ===========================================================================
def guardar_figura(nombre: str) -> None:
    """Guarda la figura en resultados/modelo_optimizado/ y cierra el plot."""
    ruta = DIR_RESULTADOS_OPT / nombre
    try:
        plt.tight_layout()
        plt.savefig(ruta, dpi=DPI, bbox_inches="tight", facecolor="white")
        print(f"  [OK] {nombre}")
    except Exception as e:
        print(f"  [ERROR] {nombre}: {e}")
    finally:
        plt.close()


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
#  FUNCION: preparar_y_dividir
# ===========================================================================
def preparar_y_dividir(df: pd.DataFrame) -> tuple:
    """
    Prepara features y realiza la misma division 70/15/15 que el script 04
    (mismo random_state=42) para garantizar conjuntos identicos.
    """
    cols_x = [c for c in df.columns if c not in COL_EXCLUIR]
    X = df[cols_x].select_dtypes(exclude=["object"]).copy()
    y = df["desercion"].copy()
    features = X.columns.tolist()

    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, test_size=0.15, stratify=y, random_state=RANDOM_STATE
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, test_size=0.1765, stratify=y_temp, random_state=RANDOM_STATE
    )
    print(f"[OK] Features: {len(features)}  |  "
          f"Train: {len(X_train):,}  Val: {len(X_val):,}  Test: {len(X_test):,}")
    return X_train, X_val, X_test, y_train, y_val, y_test, features


# ===========================================================================
#  FUNCION: evaluar_class_weights
# ===========================================================================
def evaluar_class_weights(X_train: pd.DataFrame, y_train: pd.Series,
                           cv: StratifiedKFold) -> object:
    """
    FASE 1: Evalua cada opcion de class_weight con un RF sencillo
    (n_estimators=200, max_depth=20) usando 5-fold CV con F2-score.

    Selecciona el class_weight con mayor F2 promedio.

    Retorna
    -------
    El mejor class_weight (None, 'balanced', o dict).
    """
    scorer = make_scorer(fbeta_score, beta=BETA, pos_label=1, zero_division=0)
    print(f"\n  Evaluando {len(CLASS_WEIGHTS)} opciones de class_weight con F2-score...")
    print(f"  {'class_weight':<22}  {'F2 medio':>10}  {'F2 std':>8}")
    print(f"  {'-'*22}  {'-'*10}  {'-'*8}")

    mejor_f2    = -1.0
    mejor_cw    = None

    for cw in CLASS_WEIGHTS:
        rf = RandomForestClassifier(
            n_estimators=200, max_depth=20,
            random_state=RANDOM_STATE, n_jobs=-1,
            class_weight=cw
        )
        scores = cross_val_score(rf, X_train, y_train, cv=cv, scoring=scorer, n_jobs=-1)
        etiq   = str(cw) if cw is not None else "None"
        print(f"  {etiq:<22}  {scores.mean():>10.4f}  {scores.std():>8.4f}")
        if scores.mean() > mejor_f2:
            mejor_f2 = scores.mean()
            mejor_cw = cw

    etiq_final = str(mejor_cw) if mejor_cw is not None else "None"
    print(f"\n  [OK] Mejor class_weight: {etiq_final}  (F2={mejor_f2:.4f})")
    return mejor_cw


# ===========================================================================
#  FUNCION: buscar_hiperparametros_f2
# ===========================================================================
def buscar_hiperparametros_f2(X_train: pd.DataFrame, y_train: pd.Series,
                               mejor_cw: object, cv: StratifiedKFold) -> tuple:
    """
    FASE 2: GridSearchCV completo con el mejor class_weight.
    Metrica de optimizacion: fbeta_score(beta=2).

    Parametros
    ----------
    X_train   : features de entrenamiento
    y_train   : target de entrenamiento
    mejor_cw  : class_weight seleccionado en fase 1
    cv        : StratifiedKFold configurado

    Retorna
    -------
    (mejores_params: dict, mejor_modelo: RandomForestClassifier, tiempo: float)
    """
    scorer  = make_scorer(fbeta_score, beta=BETA, pos_label=1, zero_division=0)
    n_comb  = 1
    for v in PARAM_GRID_OPT.values():
        n_comb *= len(v)

    print(f"\n  Combinaciones: {n_comb}  |  Folds: 5  |  "
          f"Total ajustes: {n_comb*5}")
    print(f"  Metrica: F{BETA}-score  |  class_weight fijo: "
          f"{'None' if mejor_cw is None else str(mejor_cw)}")
    print("  (Proceso en paralelo — n_jobs=-1)\n")

    gs = GridSearchCV(
        RandomForestClassifier(
            class_weight=mejor_cw,
            random_state=RANDOM_STATE,
            n_jobs=-1
        ),
        PARAM_GRID_OPT,
        scoring   = scorer,
        cv        = cv,
        n_jobs    = -1,
        refit     = True,
        verbose   = 0,
    )
    t0      = time.time()
    gs.fit(X_train, y_train)
    elapsed = time.time() - t0

    print(f"[OK] GridSearchCV completado en {elapsed/60:.1f} min")
    print(f"  Mejor F{BETA} (CV): {gs.best_score_:.4f}")
    print(f"  Mejores hiperparametros:")
    for p, v in gs.best_params_.items():
        print(f"    {p:<25} = {v}")

    return gs.best_params_, gs.best_estimator_, elapsed


# ===========================================================================
#  FUNCION: calcular_metricas_umbral
# ===========================================================================
def calcular_metricas_umbral(y_true: pd.Series, y_prob: np.ndarray,
                              threshold: float) -> dict:
    """
    Calcula todas las metricas de evaluacion para un umbral de decision dado.

    Metricas calculadas:
      Accuracy, Precision, Recall, Specificity, F1, F2,
      ROC-AUC, Balanced Accuracy, Average Precision, MCC, FP, FN
    """
    y_pred = (y_prob >= threshold).astype(int)
    cm     = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel() if cm.shape == (2,2) else (0,0,0,0)

    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0

    return {
        "threshold"       : threshold,
        "accuracy"        : accuracy_score(y_true, y_pred),
        "precision"       : precision_score(y_true, y_pred, zero_division=0),
        "recall"          : recall_score(y_true, y_pred, zero_division=0),
        "specificity"     : specificity,
        "f1"              : f1_score(y_true, y_pred, zero_division=0),
        "f2"              : fbeta_score(y_true, y_pred, beta=BETA, zero_division=0),
        "roc_auc"         : roc_auc_score(y_true, y_prob),
        "balanced_acc"    : balanced_accuracy_score(y_true, y_pred),
        "avg_precision"   : average_precision_score(y_true, y_prob),
        "mcc"             : matthews_corrcoef(y_true, y_pred),
        "fp"              : int(fp),
        "fn"              : int(fn),
        "tp"              : int(tp),
        "tn"              : int(tn),
    }


# ===========================================================================
#  FUNCION: analizar_thresholds
# ===========================================================================
def analizar_thresholds(modelo, X_test: pd.DataFrame,
                         y_test: pd.Series) -> pd.DataFrame:
    """
    Evalua todos los umbrales definidos en THRESHOLDS y retorna
    un DataFrame con las metricas calculadas para cada uno.
    """
    y_prob  = modelo.predict_proba(X_test)[:, 1]
    filas   = [calcular_metricas_umbral(y_test, y_prob, t) for t in THRESHOLDS]
    df_thr  = pd.DataFrame(filas)

    print("\n  Analisis de umbrales:")
    print(f"  {'Thr':>5}  {'Acc':>7}  {'Prec':>7}  {'Rec':>7}  "
          f"{'F1':>7}  {'F2':>7}  {'FP':>5}  {'FN':>5}")
    print(f"  {'-'*5}  {'-'*7}  {'-'*7}  {'-'*7}  {'-'*7}  {'-'*7}  {'-'*5}  {'-'*5}")
    for _, r in df_thr.iterrows():
        print(f"  {r['threshold']:.2f}  {r['accuracy']:>7.4f}  "
              f"{r['precision']:>7.4f}  {r['recall']:>7.4f}  "
              f"{r['f1']:>7.4f}  {r['f2']:>7.4f}  "
              f"{int(r['fp']):>5}  {int(r['fn']):>5}")
    return df_thr


# ===========================================================================
#  FUNCION: seleccionar_mejor_threshold
# ===========================================================================
def seleccionar_mejor_threshold(df_thr: pd.DataFrame) -> dict:
    """
    Selecciona el mejor umbral con la siguiente regla:
      1. Mayor F2-score.
      2. En caso de empate, mayor Recall con Precision >= 60 %.

    Retorna
    -------
    dict con todas las metricas del umbral seleccionado.
    """
    # Mejor F2
    f2_max  = df_thr["f2"].max()
    candidatos = df_thr[df_thr["f2"] == f2_max]

    if len(candidatos) == 1:
        mejor = candidatos.iloc[0].to_dict()
    else:
        # Empate: mayor Recall con Precision >= 60 %
        con_prec = candidatos[candidatos["precision"] >= 0.60]
        if len(con_prec) > 0:
            mejor = con_prec.loc[con_prec["recall"].idxmax()].to_dict()
        else:
            mejor = candidatos.loc[candidatos["recall"].idxmax()].to_dict()

    print(f"\n[OK] Umbral optimo seleccionado: {mejor['threshold']:.2f}")
    print(f"     F2={mejor['f2']:.4f}  Recall={mejor['recall']:.4f}  "
          f"Precision={mejor['precision']:.4f}")
    return mejor


# ===========================================================================
#  FUNCIONES DE GRAFICAS — MODELO OPTIMIZADO
# ===========================================================================

def grafica_opt_matriz_confusion(modelo, X_test, y_test, threshold) -> None:
    """Matriz de confusion con el umbral optimo."""
    y_prob = modelo.predict_proba(X_test)[:, 1]
    y_pred = (y_prob >= threshold).astype(int)
    cm     = confusion_matrix(y_test, y_pred)
    cm_pct = cm.astype(float) / cm.sum(axis=1, keepdims=True) * 100

    fig, ax = plt.subplots(figsize=(7, 6))
    sns.heatmap(cm, annot=False, cmap="Reds",
                xticklabels=["Activo", "Desertor"],
                yticklabels=["Activo", "Desertor"],
                linewidths=1, linecolor="white", ax=ax)
    for i in range(2):
        for j in range(2):
            ax.text(j+.5, i+.38, f"{cm[i,j]:,}",
                    ha="center", va="center", fontsize=16, fontweight="bold",
                    color="white" if cm[i,j] > cm.max()*.5 else "black")
            ax.text(j+.5, i+.65, f"({cm_pct[i,j]:.1f}%)",
                    ha="center", va="center", fontsize=9,
                    color="white" if cm[i,j] > cm.max()*.5 else "black")
    rec = recall_score(y_test, y_pred, zero_division=0)
    f2  = fbeta_score(y_test, y_pred, beta=BETA, zero_division=0)
    ax.set_title(f"Matriz de Confusion — Optimizado  (umbral={threshold:.2f})\n"
                 f"Recall={rec:.4f}  F2={f2:.4f}")
    ax.set_ylabel("Real"); ax.set_xlabel("Predicho")
    guardar_figura("matriz_confusion.png")


def grafica_opt_roc(modelo, X_test, y_test) -> None:
    """Curva ROC del modelo optimizado."""
    y_prob = modelo.predict_proba(X_test)[:, 1]
    fpr, tpr, thresh = roc_curve(y_test, y_prob)
    auc_val = roc_auc_score(y_test, y_prob)
    j_idx   = np.argmax(tpr - fpr)

    fig, ax = plt.subplots(figsize=(7, 6))
    ax.plot(fpr, tpr, color="#e74c3c", lw=2.5, label=f"RF Optimizado (AUC={auc_val:.4f})")
    ax.fill_between(fpr, tpr, alpha=0.12, color="#e74c3c")
    ax.plot([0,1],[0,1],"k--", lw=1, label="Aleatorio")
    ax.scatter(fpr[j_idx], tpr[j_idx], color="navy", s=80, zorder=5,
               label=f"Optimo Youden thr={thresh[j_idx]:.2f}")
    ax.set_title("Curva ROC — Modelo Optimizado")
    ax.set_xlabel("Tasa Falsos Positivos")
    ax.set_ylabel("Tasa Verdaderos Positivos")
    ax.legend(loc="lower right"); ax.grid(True, alpha=0.3)
    guardar_figura("roc_curve.png")


def grafica_opt_precision_recall(modelo, X_test, y_test) -> None:
    """Curva Precision-Recall del modelo optimizado."""
    y_prob = modelo.predict_proba(X_test)[:, 1]
    prec, rec, _ = precision_recall_curve(y_test, y_prob)
    ap  = average_precision_score(y_test, y_prob)
    bl  = y_test.mean()

    fig, ax = plt.subplots(figsize=(7, 6))
    ax.plot(rec, prec, color="#e74c3c", lw=2.5, label=f"RF Optimizado (AP={ap:.4f})")
    ax.fill_between(rec, prec, alpha=0.12, color="#e74c3c")
    ax.axhline(bl, color="gray", linestyle="--", lw=1.2, label=f"Baseline ({bl:.2f})")
    ax.set_title("Curva Precision-Recall — Modelo Optimizado")
    ax.set_xlabel("Recall"); ax.set_ylabel("Precision")
    ax.legend(); ax.grid(True, alpha=0.3)
    guardar_figura("precision_recall_curve.png")


def grafica_recall_vs_threshold(df_thr: pd.DataFrame) -> None:
    """Recall en funcion del umbral de decision."""
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(df_thr["threshold"], df_thr["recall"], "o-",
            color="#e74c3c", lw=2.5, markersize=8, label="Recall")
    ax.plot(df_thr["threshold"], df_thr["precision"], "s--",
            color="#3498db", lw=1.8, markersize=7, label="Precision")
    mejor_thr = df_thr.loc[df_thr["f2"].idxmax(), "threshold"]
    ax.axvline(mejor_thr, color="orange", linestyle=":", lw=2,
               label=f"Umbral optimo ({mejor_thr:.2f})")
    ax.set_title("Recall y Precision vs Umbral de Decision")
    ax.set_xlabel("Umbral"); ax.set_ylabel("Score")
    ax.set_xlim(0.20, 0.55); ax.set_ylim(0, 1.05)
    ax.legend(); ax.grid(True, alpha=0.3)
    guardar_figura("recall_vs_threshold.png")


def grafica_precision_vs_threshold(df_thr: pd.DataFrame) -> None:
    """Precision vs Recall por umbral (curva de intercambio)."""
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(df_thr["threshold"], df_thr["precision"], "s-",
            color="#3498db", lw=2.5, markersize=8, label="Precision")
    ax.plot(df_thr["threshold"], df_thr["specificity"], "^--",
            color="#2ecc71", lw=1.8, markersize=7, label="Specificity")
    mejor_thr = df_thr.loc[df_thr["f2"].idxmax(), "threshold"]
    ax.axvline(mejor_thr, color="orange", linestyle=":", lw=2,
               label=f"Umbral optimo ({mejor_thr:.2f})")
    ax.set_title("Precision y Specificity vs Umbral de Decision")
    ax.set_xlabel("Umbral"); ax.set_ylabel("Score")
    ax.set_xlim(0.20, 0.55); ax.set_ylim(0, 1.05)
    ax.legend(); ax.grid(True, alpha=0.3)
    guardar_figura("precision_vs_threshold.png")


def grafica_f2score_vs_threshold(df_thr: pd.DataFrame) -> None:
    """F2-Score y F1-Score en funcion del umbral."""
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(df_thr["threshold"], df_thr["f2"], "o-",
            color="#e67e22", lw=2.5, markersize=8, label="F2-Score")
    ax.plot(df_thr["threshold"], df_thr["f1"], "s--",
            color="#9b59b6", lw=1.8, markersize=7, label="F1-Score")
    mejor_thr = df_thr.loc[df_thr["f2"].idxmax(), "threshold"]
    ax.axvline(mejor_thr, color="orange", linestyle=":", lw=2,
               label=f"Umbral optimo ({mejor_thr:.2f})")
    ax.set_title("F2-Score y F1-Score vs Umbral de Decision")
    ax.set_xlabel("Umbral"); ax.set_ylabel("Score")
    ax.set_xlim(0.20, 0.55); ax.set_ylim(0, 1.05)
    ax.legend(); ax.grid(True, alpha=0.3)
    guardar_figura("f2score_vs_threshold.png")


def grafica_calibration_curve(modelo, X_test, y_test) -> None:
    """Curva de calibracion: probabilidades predichas vs frecuencia real."""
    y_prob = modelo.predict_proba(X_test)[:, 1]
    frac_pos, mean_pred = calibration_curve(y_test, y_prob, n_bins=10)

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))

    # Calibracion
    axes[0].plot(mean_pred, frac_pos, "o-", color="#e74c3c", lw=2.5,
                 markersize=7, label="RF Optimizado")
    axes[0].plot([0,1],[0,1],"k--", lw=1, label="Calibracion perfecta")
    axes[0].set_title("Curva de Calibracion")
    axes[0].set_xlabel("Probabilidad media predicha")
    axes[0].set_ylabel("Fraccion de positivos reales")
    axes[0].legend(); axes[0].grid(True, alpha=0.3)

    # Histograma de probabilidades
    axes[1].hist(y_prob, bins=40, color="#e74c3c", alpha=0.7, edgecolor="white")
    axes[1].set_title("Histograma de Probabilidades Predichas")
    axes[1].set_xlabel("P(Desercion)"); axes[1].set_ylabel("Frecuencia")
    axes[1].grid(True, alpha=0.3)

    guardar_figura("calibration_curve.png")


def grafica_feature_importance(modelo, features: list) -> None:
    """Importancia MDI del modelo optimizado."""
    imp    = modelo.feature_importances_
    df_imp = pd.DataFrame({"v": features, "i": imp}).sort_values("i", ascending=True)
    n      = len(df_imp)
    paleta = sns.color_palette("Reds_r", n_colors=n)[::-1]

    fig, ax = plt.subplots(figsize=(10, max(6, n * 0.38)))
    bars = ax.barh(df_imp["v"], df_imp["i"], color=paleta, edgecolor="white")
    for bar, val in zip(bars, df_imp["i"]):
        ax.text(val + 0.001, bar.get_y() + bar.get_height()/2,
                f"{val:.4f}", va="center", fontsize=8)
    ax.set_title("Importancia de Variables (MDI) — Modelo Optimizado")
    ax.set_xlabel("Mean Decrease in Impurity")
    ax.grid(axis="x", alpha=0.3)
    guardar_figura("feature_importance.png")


def grafica_permutation_importance(modelo, X_test, y_test, features: list) -> pd.DataFrame:
    """Importancia por permutacion (mas robusta que MDI)."""
    scorer = make_scorer(fbeta_score, beta=BETA, pos_label=1, zero_division=0)
    result = permutation_importance(
        modelo, X_test, y_test,
        scoring     = scorer,
        n_repeats   = 10,
        random_state= RANDOM_STATE,
        n_jobs      = -1
    )
    df_perm = pd.DataFrame({
        "variable"  : features,
        "importancia_media": result.importances_mean,
        "importancia_std"  : result.importances_std,
    }).sort_values("importancia_media", ascending=True)

    fig, ax = plt.subplots(figsize=(10, max(6, len(features) * 0.38)))
    colores = ["#e74c3c" if v > 0 else "#95a5a6" for v in df_perm["importancia_media"]]
    ax.barh(df_perm["variable"], df_perm["importancia_media"],
            xerr=df_perm["importancia_std"], color=colores,
            edgecolor="white", capsize=3)
    ax.axvline(0, color="black", lw=0.8)
    ax.set_title("Importancia por Permutacion — Modelo Optimizado")
    ax.set_xlabel(f"Reduccion en F{BETA}-score")
    ax.grid(axis="x", alpha=0.3)
    guardar_figura("permutation_importance.png")
    return df_perm


def grafica_distribucion_prob_con_umbral(modelo, X_test, y_test, threshold) -> None:
    """Distribucion de probabilidades con linea del umbral optimo."""
    y_prob = modelo.predict_proba(X_test)[:, 1]
    fig, ax = plt.subplots(figsize=(9, 5))
    for cls, lbl, color in zip([0, 1], ["Activo", "Desertor"], ["#2ecc71", "#e74c3c"]):
        ax.hist(y_prob[y_test == cls], bins=40, alpha=0.65,
                label=lbl, color=color, edgecolor="white")
    ax.axvline(threshold, color="navy", linestyle="--", lw=2,
               label=f"Umbral optimo ({threshold:.2f})")
    ax.axvline(0.5, color="gray", linestyle=":", lw=1.2, label="Umbral 0.50")
    ax.set_title(f"Distribucion de Probabilidades — Umbral optimo={threshold:.2f}")
    ax.set_xlabel("P(Desercion)"); ax.set_ylabel("Frecuencia")
    ax.legend()
    guardar_figura("distribucion_probabilidades.png")


def grafica_curva_gain(modelo, X_test, y_test) -> None:
    """
    Curva de ganancia acumulada:
      Eje X: % de la poblacion contactada (ordenada por probabilidad desc.)
      Eje Y: % de desertores detectados (Recall acumulado)
    """
    y_prob   = modelo.predict_proba(X_test)[:, 1]
    n        = len(y_test)
    n_pos    = y_test.sum()
    idx_sort = np.argsort(y_prob)[::-1]
    y_sort   = y_test.values[idx_sort]

    pct_pob  = np.arange(1, n+1) / n
    cum_pos  = np.cumsum(y_sort)
    gain     = cum_pos / n_pos   # Recall acumulado

    fig, ax = plt.subplots(figsize=(8, 6))
    ax.plot(pct_pob * 100, gain * 100, color="#e74c3c", lw=2.5,
            label="Modelo Optimizado")
    ax.plot([0, 100], [0, 100], "k--", lw=1, label="Aleatorio")
    ax.plot([0, n_pos/n*100, 100], [0, 100, 100], "g--", lw=1, label="Modelo perfecto")
    ax.set_title("Curva de Ganancia Acumulada (Cumulative Gain)")
    ax.set_xlabel("% Poblacion contactada")
    ax.set_ylabel("% Desertores detectados (Gain)")
    ax.legend(); ax.grid(True, alpha=0.3)
    guardar_figura("curva_gain.png")


def grafica_curva_lift(modelo, X_test, y_test) -> None:
    """
    Curva Lift:
      Lift = Tasa de exito del modelo / Tasa de exito aleatoria
      Valores > 1.0 indican que el modelo supera a seleccion aleatoria
    """
    y_prob   = modelo.predict_proba(X_test)[:, 1]
    n        = len(y_test)
    n_pos    = y_test.sum()
    idx_sort = np.argsort(y_prob)[::-1]
    y_sort   = y_test.values[idx_sort]

    pct_pob  = np.arange(1, n+1) / n
    cum_pos  = np.cumsum(y_sort)
    gain     = cum_pos / n_pos
    lift     = gain / pct_pob          # lift = recall_acumulado / pct_poblacion

    fig, ax = plt.subplots(figsize=(8, 6))
    ax.plot(pct_pob * 100, lift, color="#e74c3c", lw=2.5, label="Modelo Optimizado")
    ax.axhline(1.0, color="k", linestyle="--", lw=1, label="Baseline (aleatorio)")
    ax.set_title("Curva Lift Acumulado")
    ax.set_xlabel("% Poblacion contactada")
    ax.set_ylabel("Lift")
    ax.legend(); ax.grid(True, alpha=0.3)
    guardar_figura("curva_lift.png")


# ===========================================================================
#  FUNCION: guardar_artefactos_csv_xlsx
# ===========================================================================
def guardar_artefactos_csv_xlsx(df_thr: pd.DataFrame, df_imp: pd.DataFrame,
                                 df_perm: pd.DataFrame) -> None:
    """
    Guarda los artefactos de analisis en CSV y XLSX.
    """
    archivos = [
        (df_imp,  DIR_RESULTADOS_OPT / "feature_importance.csv"),
        (df_perm, DIR_RESULTADOS_OPT / "permutation_importance.csv"),
        (df_thr,  DIR_RESULTADOS_OPT / "threshold_analysis.csv"),
    ]
    for df_out, ruta in archivos:
        try:
            df_out.to_csv(ruta, index=False, encoding="utf-8-sig")
            print(f"  [OK] {ruta.name}")
        except Exception as e:
            print(f"  [ERROR] {ruta.name}: {e}")

    # XLSX con multiples hojas
    ruta_xlsx = DIR_RESULTADOS_OPT / "threshold_analysis.xlsx"
    try:
        with pd.ExcelWriter(ruta_xlsx, engine="openpyxl") as writer:
            df_thr.to_excel(writer,  sheet_name="Threshold_Analysis", index=False)
            df_imp.to_excel(writer,  sheet_name="Feature_Importance",  index=False)
            df_perm.to_excel(writer, sheet_name="Permutation_Imp",     index=False)
        print(f"  [OK] threshold_analysis.xlsx (3 hojas)")
    except Exception as e:
        print(f"  [ERROR] XLSX: {e}")


# ===========================================================================
#  FUNCION: guardar_modelo_optimizado
# ===========================================================================
def guardar_modelo_optimizado(modelo, X_test, y_test, features,
                               params, mejor_umbral: dict,
                               df_thr: pd.DataFrame,
                               training_time: float) -> None:
    """
    Serializa el modelo optimizado y todos los metadatos con joblib.
    El PKL incluye: modelo, datos de prueba, parametros, umbral optimo,
    analisis de thresholds y tiempos de entrenamiento.
    """
    payload = {
        "modelo"           : modelo,
        "X_test"           : X_test,
        "y_test"           : y_test,
        "features"         : features,
        "params"           : params,
        "threshold"        : mejor_umbral["threshold"],
        "threshold_metrics": mejor_umbral,
        "threshold_analysis": df_thr,
        "training_time"    : training_time,
        "timestamp"        : datetime.now().isoformat(),
        "tipo"             : "optimizado",
    }
    try:
        joblib.dump(payload, RUTA_MODELO_OPT, compress=3)
        kb = RUTA_MODELO_OPT.stat().st_size / 1024
        print(f"\n[OK] Modelo optimizado guardado: {RUTA_MODELO_OPT}  ({kb:.1f} KB)")
    except Exception as e:
        print(f"\n[ERROR] No se pudo guardar el modelo: {e}")


# ===========================================================================
#  FUNCION PRINCIPAL
# ===========================================================================
def main():
    """
    Orquesta la optimizacion completa del modelo Random Forest.
    Flujo de 2 fases:
      Fase 1: Seleccion de class_weight por CV con F2-score
      Fase 2: GridSearchCV completo con el mejor class_weight
    """
    print("\n" + "="*65)
    print("  SCRIPT 05 - OPTIMIZACION RANDOM FOREST")
    print("  Objetivo: Maximizar Recall/F2 para deteccion temprana")
    print("  CRISP-DM | Fase: Modelado | random_state=42")
    print("="*65)

    crear_directorios()
    aplicar_estilo()

    # Paso 1: carga de datos
    print("\n[1/9] Cargando dataset limpio...")
    try:
        df = cargar_datos()
    except FileNotFoundError as e:
        print(e); return

    # Paso 2: preparacion y division
    print("\n[2/9] Preparando features y dividiendo datos...")
    X_train, X_val, X_test, y_train, y_val, y_test, features = preparar_y_dividir(df)

    # Paso 3: StratifiedKFold para ambas fases
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

    # Paso 4: evaluar class_weight (Fase 1)
    print("\n[3/9] FASE 1 — Evaluacion de class_weight con F2-score...")
    mejor_cw = evaluar_class_weights(X_train, y_train, cv)

    # Paso 5: GridSearchCV con F2 (Fase 2)
    print("\n[4/9] FASE 2 — GridSearchCV con F2-score...")
    t0 = time.time()
    params, modelo, _ = buscar_hiperparametros_f2(X_train, y_train, mejor_cw, cv)
    training_time = time.time() - t0

    # Paso 6: analisis de thresholds
    print("\n[5/9] Analizando umbrales de decision...")
    df_thr = analizar_thresholds(modelo, X_test, y_test)
    mejor_umbral = seleccionar_mejor_threshold(df_thr)

    # Paso 7: importancia de variables
    print("\n[6/9] Calculando importancia de variables...")
    y_prob = modelo.predict_proba(X_test)[:, 1]
    imp    = modelo.feature_importances_
    df_imp = pd.DataFrame({
        "variable"      : features,
        "importancia"   : imp,
        "importancia_pct": imp / imp.sum() * 100,
    }).sort_values("importancia", ascending=False).reset_index(drop=True)
    df_imp["rank"] = range(1, len(df_imp) + 1)

    print("\n[7/9] Calculando importancia por permutacion...")
    df_perm = grafica_permutation_importance(modelo, X_test, y_test, features)

    # Paso 8: graficas
    print("\n[8/9] Generando graficas del modelo optimizado...")
    threshold_opt = mejor_umbral["threshold"]
    grafica_opt_matriz_confusion(modelo, X_test, y_test, threshold_opt)
    grafica_opt_roc(modelo, X_test, y_test)
    grafica_opt_precision_recall(modelo, X_test, y_test)
    grafica_recall_vs_threshold(df_thr)
    grafica_precision_vs_threshold(df_thr)
    grafica_f2score_vs_threshold(df_thr)
    grafica_calibration_curve(modelo, X_test, y_test)
    grafica_feature_importance(modelo, features)
    grafica_distribucion_prob_con_umbral(modelo, X_test, y_test, threshold_opt)
    grafica_curva_gain(modelo, X_test, y_test)
    grafica_curva_lift(modelo, X_test, y_test)

    # Paso 9: guardar artefactos
    print("\n[9/9] Guardando artefactos CSV/XLSX y modelo...")
    guardar_artefactos_csv_xlsx(df_thr, df_imp, df_perm)
    guardar_modelo_optimizado(modelo, X_test, y_test, features, params,
                               mejor_umbral, df_thr, training_time)

    # Resumen final
    y_pred = (y_prob >= threshold_opt).astype(int)
    print("\n" + "="*65)
    print(f"  EVALUACION FINAL — MODELO OPTIMIZADO (umbral={threshold_opt:.2f})")
    print("="*65)
    print(f"  Accuracy        : {accuracy_score(y_test, y_pred):.4f}")
    print(f"  Precision       : {precision_score(y_test, y_pred, zero_division=0):.4f}")
    print(f"  Recall          : {recall_score(y_test, y_pred, zero_division=0):.4f}")
    print(f"  F1-Score        : {f1_score(y_test, y_pred, zero_division=0):.4f}")
    print(f"  F2-Score        : {fbeta_score(y_test, y_pred, beta=BETA, zero_division=0):.4f}")
    print(f"  ROC-AUC         : {roc_auc_score(y_test, y_prob):.4f}")
    print(f"  Balanced Acc    : {balanced_accuracy_score(y_test, y_pred):.4f}")
    print(f"  MCC             : {matthews_corrcoef(y_test, y_pred):.4f}")
    print(f"  Tiempo train    : {training_time/60:.1f} min")
    print(f"  Graficas        : {DIR_RESULTADOS_OPT}")
    print("="*65)
    print("\n[COMPLETO] Script 05 finalizado exitosamente.\n")


if __name__ == "__main__":
    main()
