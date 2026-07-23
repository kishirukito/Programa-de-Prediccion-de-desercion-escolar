"""
===========================================================================
 SCRIPT 04 - ENTRENAMIENTO DEL MODELO RANDOM FOREST BASE
 Proyecto : Prediccion de Desercion Escolar - Ingenieria en Software
 Entrada  : dataset/dataset_limpio.csv
 Salidas  : modelos/random_forest_base.pkl
            resultados/modelo_base/ (5 graficas)
            reportes/importancia_variables.csv
===========================================================================
 Metodologia CRISP-DM - Fase: Modelado
 Division  : 70% entrenamiento | 15% validacion | 15% prueba (estratificada)
 Busqueda  : GridSearchCV (5-fold CV, metrica f1_weighted)
 Python    : 3.12  |  random_state = 42
===========================================================================
"""

import sys
import io
import time
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
from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, classification_report,
    confusion_matrix, roc_curve, precision_recall_curve,
    average_precision_score
)

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# ===========================================================================
#  RUTAS Y CONFIGURACION
# ===========================================================================
BASE_DIR              = Path(__file__).parent
DIR_DATASET           = BASE_DIR / "dataset"
DIR_MODELOS           = BASE_DIR / "modelos"
DIR_REPORTES          = BASE_DIR / "reportes"
DIR_RESULTADOS_BASE   = BASE_DIR / "resultados" / "modelo_base"
RUTA_DATOS            = DIR_DATASET / "dataset_limpio.csv"
RUTA_MODELO           = DIR_MODELOS / "random_forest_base.pkl"
RUTA_IMP              = DIR_REPORTES / "importancia_variables.csv"

RANDOM_STATE = 42
DPI          = 120
COL_EXCLUIR  = ["id_estudiante", "desercion"]

# Grid de hiperparametros para GridSearchCV
PARAM_GRID = {
    "n_estimators"     : [100, 200, 300],
    "max_depth"        : [None, 10, 20],
    "min_samples_split": [2, 5],
    "min_samples_leaf" : [1, 2],
    "class_weight"     : ["balanced", None],
}


def aplicar_estilo():
    """Aplica estilo global a las graficas."""
    sns.set_theme(style="whitegrid")
    plt.rcParams.update({
        "figure.dpi": DPI, "font.family": "DejaVu Sans",
        "axes.titlesize": 13, "axes.titleweight": "bold",
        "axes.labelsize": 11, "figure.facecolor": "white",
    })


def guardar_figura(ruta: Path) -> None:
    """Guarda y cierra la figura actual."""
    try:
        plt.tight_layout()
        plt.savefig(ruta, dpi=DPI, bbox_inches="tight", facecolor="white")
        print(f"  [OK] {ruta.name}")
    except Exception as e:
        print(f"  [ERROR] {ruta.name}: {e}")
    finally:
        plt.close()


# ===========================================================================
#  FUNCION: crear_directorios
# ===========================================================================
def crear_directorios():
    """Crea todos los directorios necesarios del proyecto."""
    for d in [DIR_DATASET, DIR_MODELOS, DIR_REPORTES, DIR_RESULTADOS_BASE]:
        d.mkdir(parents=True, exist_ok=True)
    print("[OK] Directorios verificados.")


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
    print(f"[OK] Dataset cargado: {len(df):,} registros x {df.shape[1]} columnas")
    return df


# ===========================================================================
#  FUNCION: preparar_features
# ===========================================================================
def preparar_features(df: pd.DataFrame) -> tuple:
    """
    Separa X (features) de y (target).
    Excluye id_estudiante y columnas de texto.
    """
    cols_x = [c for c in df.columns if c not in COL_EXCLUIR]
    X      = df[cols_x].copy()
    y      = df["desercion"].copy()
    cols_texto = X.select_dtypes(include=["object"]).columns.tolist()
    if cols_texto:
        X = X.drop(columns=cols_texto)
    print(f"[OK] Features: {X.shape[1]} variables  |  "
          f"Activos: {(y==0).sum():,}  Desertores: {(y==1).sum():,}")
    return X, y, X.columns.tolist()


# ===========================================================================
#  FUNCION: dividir_datos
# ===========================================================================
def dividir_datos(X: pd.DataFrame, y: pd.Series) -> tuple:
    """
    Division estratificada: 70% train | 15% val | 15% test.
    """
    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, test_size=0.15, stratify=y, random_state=RANDOM_STATE
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, test_size=0.1765, stratify=y_temp, random_state=RANDOM_STATE
    )
    print(f"[OK] Train: {len(X_train):,}  Val: {len(X_val):,}  Test: {len(X_test):,}")
    return X_train, X_val, X_test, y_train, y_val, y_test


# ===========================================================================
#  FUNCION: buscar_hiperparametros
# ===========================================================================
def buscar_hiperparametros(X_train, y_train) -> tuple:
    """
    GridSearchCV con 5-fold estratificado, metrica f1_weighted.
    Solo usa el conjunto de entrenamiento.
    """
    n_comb = 1
    for v in PARAM_GRID.values():
        n_comb *= len(v)
    print(f"  Combinaciones: {n_comb}  |  Folds: 5  |  "
          f"Total ajustes: {n_comb*5}  |  Metrica: f1_weighted")

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    gs = GridSearchCV(
        RandomForestClassifier(random_state=RANDOM_STATE, n_jobs=-1),
        PARAM_GRID, scoring="f1_weighted", cv=cv, n_jobs=-1, refit=True, verbose=0
    )
    t0 = time.time()
    gs.fit(X_train, y_train)
    elapsed = time.time() - t0

    print(f"\n[OK] Busqueda completada en {elapsed:.1f}s")
    print(f"  Mejor F1 (CV): {gs.best_score_:.4f}")
    for p, v in gs.best_params_.items():
        print(f"    {p:<25} = {v}")
    return gs.best_params_, gs.best_estimator_, elapsed


# ===========================================================================
#  FUNCION: evaluar_en_validacion
# ===========================================================================
def evaluar_en_validacion(modelo, X_val, y_val) -> dict:
    """Evalua el mejor modelo sobre el conjunto de validacion."""
    y_pred = modelo.predict(X_val)
    y_prob = modelo.predict_proba(X_val)[:, 1]
    m = {
        "accuracy" : accuracy_score(y_val, y_pred),
        "precision": precision_score(y_val, y_pred, zero_division=0),
        "recall"   : recall_score(y_val, y_pred, zero_division=0),
        "f1"       : f1_score(y_val, y_pred, zero_division=0),
        "roc_auc"  : roc_auc_score(y_val, y_prob),
    }
    print(f"\n[VAL]  Acc={m['accuracy']:.4f}  Prec={m['precision']:.4f}  "
          f"Rec={m['recall']:.4f}  F1={m['f1']:.4f}  AUC={m['roc_auc']:.4f}")
    return m


# ===========================================================================
#  FUNCION: guardar_importancia_variables
# ===========================================================================
def guardar_importancia_variables(modelo, features: list) -> None:
    """Guarda importancia de variables en CSV."""
    df_imp = pd.DataFrame({
        "variable": features, "importancia": modelo.feature_importances_
    }).sort_values("importancia", ascending=False).reset_index(drop=True)
    df_imp["importancia_pct"] = (df_imp["importancia"] / df_imp["importancia"].sum() * 100).round(2)
    df_imp["rank"] = range(1, len(df_imp) + 1)
    try:
        df_imp.to_csv(RUTA_IMP, index=False, encoding="utf-8-sig")
        print(f"[OK] importancia_variables.csv guardado")
    except Exception as e:
        print(f"[ERROR] importancia: {e}")

    print("\n  Top-10 variables:")
    print(f"  {'Rank':<5} {'Variable':<35} {'Imp':>8}  {'%':>7}")
    print(f"  {'-'*5} {'-'*35} {'-'*8}  {'-'*7}")
    for _, r in df_imp.head(10).iterrows():
        print(f"  {int(r['rank']):<5} {r['variable']:<35} {r['importancia']:>8.4f}  {r['importancia_pct']:>6.2f}%")
    return df_imp


# ===========================================================================
#  FUNCIONES DE GRAFICAS — MODELO BASE
# ===========================================================================

def grafica_base_matriz_confusion(modelo, X_test, y_test) -> None:
    """Matriz de confusion del modelo base."""
    y_pred = modelo.predict(X_test)
    cm     = confusion_matrix(y_test, y_pred)
    cm_pct = cm.astype(float) / cm.sum(axis=1, keepdims=True) * 100

    fig, ax = plt.subplots(figsize=(7, 6))
    sns.heatmap(cm, annot=False, cmap="Blues",
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
    acc = accuracy_score(y_test, y_pred)
    f1  = f1_score(y_test, y_pred, zero_division=0)
    ax.set_title(f"Matriz de Confusion — Modelo Base\nAcc={acc:.4f}  F1={f1:.4f}")
    ax.set_ylabel("Real")
    ax.set_xlabel("Predicho")
    guardar_figura(DIR_RESULTADOS_BASE / "matriz_confusion.png")


def grafica_base_roc(modelo, X_test, y_test) -> None:
    """Curva ROC del modelo base."""
    y_prob = modelo.predict_proba(X_test)[:, 1]
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    auc_val = roc_auc_score(y_test, y_prob)
    fig, ax = plt.subplots(figsize=(7, 6))
    ax.plot(fpr, tpr, color="#3498db", lw=2.5, label=f"RF Base (AUC={auc_val:.4f})")
    ax.fill_between(fpr, tpr, alpha=0.12, color="#3498db")
    ax.plot([0,1],[0,1],"k--", lw=1, label="Aleatorio")
    ax.set_title("Curva ROC — Modelo Base")
    ax.set_xlabel("Tasa Falsos Positivos")
    ax.set_ylabel("Tasa Verdaderos Positivos")
    ax.legend(loc="lower right")
    ax.grid(True, alpha=0.3)
    guardar_figura(DIR_RESULTADOS_BASE / "roc_curve.png")


def grafica_base_precision_recall(modelo, X_test, y_test) -> None:
    """Curva Precision-Recall del modelo base."""
    y_prob = modelo.predict_proba(X_test)[:, 1]
    prec, rec, _ = precision_recall_curve(y_test, y_prob)
    ap = average_precision_score(y_test, y_prob)
    baseline = y_test.mean()
    fig, ax = plt.subplots(figsize=(7, 6))
    ax.plot(rec, prec, color="#9b59b6", lw=2.5, label=f"RF Base (AP={ap:.4f})")
    ax.fill_between(rec, prec, alpha=0.12, color="#9b59b6")
    ax.axhline(baseline, color="gray", linestyle="--", lw=1.2,
               label=f"Baseline ({baseline:.2f})")
    ax.set_title("Curva Precision-Recall — Modelo Base")
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.legend()
    ax.grid(True, alpha=0.3)
    guardar_figura(DIR_RESULTADOS_BASE / "precision_recall_curve.png")


def grafica_base_importancia(modelo, features: list) -> None:
    """Importancia de variables del modelo base."""
    imp    = modelo.feature_importances_
    df_imp = pd.DataFrame({"v": features, "i": imp}).sort_values("i", ascending=True)
    n      = len(df_imp)
    paleta = sns.color_palette("Blues_r", n_colors=n)[::-1]
    fig, ax = plt.subplots(figsize=(10, max(6, n * 0.38)))
    bars = ax.barh(df_imp["v"], df_imp["i"], color=paleta, edgecolor="white")
    for bar, val in zip(bars, df_imp["i"]):
        ax.text(val + 0.001, bar.get_y() + bar.get_height()/2,
                f"{val:.4f}", va="center", fontsize=8)
    ax.set_title("Importancia de Variables — Modelo Base")
    ax.set_xlabel("Mean Decrease in Impurity")
    ax.grid(axis="x", alpha=0.3)
    guardar_figura(DIR_RESULTADOS_BASE / "feature_importance.png")


def grafica_base_distribucion_prob(modelo, X_test, y_test) -> None:
    """Distribucion de probabilidades predichas por clase."""
    y_prob = modelo.predict_proba(X_test)[:, 1]
    fig, ax = plt.subplots(figsize=(9, 5))
    for cls, lbl, color in zip([0, 1], ["Activo", "Desertor"], ["#2ecc71", "#e74c3c"]):
        mask = (y_test == cls)
        ax.hist(y_prob[mask], bins=40, alpha=0.65, label=lbl,
                color=color, edgecolor="white")
    ax.axvline(0.5, color="black", linestyle="--", lw=1.5, label="Umbral 0.50")
    ax.set_title("Distribucion de Probabilidades Predichas — Modelo Base")
    ax.set_xlabel("P(Desercion)")
    ax.set_ylabel("Frecuencia")
    ax.legend()
    guardar_figura(DIR_RESULTADOS_BASE / "distribucion_probabilidades.png")


# ===========================================================================
#  FUNCION: guardar_modelo
# ===========================================================================
def guardar_modelo(modelo, X_test, y_test, features, params,
                   metricas_val, training_time) -> None:
    """
    Serializa modelo base + datos de prueba con joblib.
    El PKL contiene todo lo necesario para el script 06.
    """
    payload = {
        "modelo"       : modelo,
        "X_test"       : X_test,
        "y_test"       : y_test,
        "features"     : features,
        "params"       : params,
        "val_metrics"  : metricas_val,
        "threshold"    : 0.50,
        "training_time": training_time,
        "timestamp"    : datetime.now().isoformat(),
        "tipo"         : "base",
    }
    try:
        joblib.dump(payload, RUTA_MODELO, compress=3)
        kb = RUTA_MODELO.stat().st_size / 1024
        print(f"\n[OK] Modelo guardado: {RUTA_MODELO}  ({kb:.1f} KB)")
    except Exception as e:
        print(f"\n[ERROR] No se pudo guardar el modelo: {e}")


# ===========================================================================
#  FUNCION PRINCIPAL
# ===========================================================================
def main():
    """Orquesta el entrenamiento del modelo Random Forest base."""
    print("\n" + "="*65)
    print("  SCRIPT 04 - ENTRENAMIENTO RANDOM FOREST BASE")
    print("  CRISP-DM | Fase: Modelado | random_state=42")
    print("="*65)

    crear_directorios()
    aplicar_estilo()

    print("\n[1/7] Cargando dataset limpio...")
    try:
        df = cargar_datos()
    except FileNotFoundError as e:
        print(e); return

    print("\n[2/7] Preparando features...")
    X, y, features = preparar_features(df)

    print("\n[3/7] Dividiendo datos (70/15/15)...")
    X_train, X_val, X_test, y_train, y_val, y_test = dividir_datos(X, y)

    print("\n[4/7] GridSearchCV (f1_weighted)...")
    t_inicio = time.time()
    params, modelo, _ = buscar_hiperparametros(X_train, y_train)
    training_time = time.time() - t_inicio

    print("\n[5/7] Evaluando en validacion...")
    metricas_val = evaluar_en_validacion(modelo, X_val, y_val)

    print("\n[6/7] Guardando artefactos e importancia...")
    guardar_importancia_variables(modelo, features)
    guardar_modelo(modelo, X_test, y_test, features, params,
                   metricas_val, training_time)

    print("\n[7/7] Generando graficas del modelo base...")
    grafica_base_matriz_confusion(modelo, X_test, y_test)
    grafica_base_roc(modelo, X_test, y_test)
    grafica_base_precision_recall(modelo, X_test, y_test)
    grafica_base_importancia(modelo, features)
    grafica_base_distribucion_prob(modelo, X_test, y_test)

    # Metricas finales en test
    y_pred = modelo.predict(X_test)
    y_prob = modelo.predict_proba(X_test)[:, 1]

    print("\n" + "="*65)
    print("  RESUMEN — MODELO BASE (conjunto de prueba)")
    print("="*65)
    print(f"  Accuracy  : {accuracy_score(y_test, y_pred):.4f}")
    print(f"  Precision : {precision_score(y_test, y_pred, zero_division=0):.4f}")
    print(f"  Recall    : {recall_score(y_test, y_pred, zero_division=0):.4f}")
    print(f"  F1-Score  : {f1_score(y_test, y_pred, zero_division=0):.4f}")
    print(f"  ROC-AUC   : {roc_auc_score(y_test, y_prob):.4f}")
    print(f"  Tiempo    : {training_time:.1f}s")
    print(f"  Graficas  : {DIR_RESULTADOS_BASE}")
    print("="*65)
    print("\n[COMPLETO] Script 04 finalizado.\n")


if __name__ == "__main__":
    main()
