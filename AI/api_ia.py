from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
from pathlib import Path
import os

app = FastAPI(
    title="EduPredict AI Model Service",
    description="Microservicio FastAPI para predecir la deserción escolar a partir de variables MDI.",
    version="1.0"
)

# Frontend (Vite): http://localhost:5173
# Backend (Node.js/Express): http://localhost:5000
# Servidor IA (Python/FastAPI): http://localhost:8000

# Configurar CORS para permitir peticiones desde Node.js/Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración de rutas de modelo
BASE_DIR = Path(__file__).parent
MODEL_PATHS_TO_TRY = [
    #BASE_DIR / "Proyecto_Desercion_Escolar" / "modelos" / "random_forest_base.pkl",
    #BASE_DIR / "Proyecto_Desercion_Escolar" / "modelos" / "random_forest.pkl",
    BASE_DIR / "Proyecto_Desercion_Escolar" / "modelos" / "random_forest_optimizado.pkl",
]

model = None
model_features = None
model_name_loaded = ""

for path in MODEL_PATHS_TO_TRY:
    if path.exists():
        try:
            pkl_data = joblib.load(path)
            # El .pkl puede ser el modelo directo o un dict con claves {'modelo', 'features', ...}
            if isinstance(pkl_data, dict):
                model = pkl_data['modelo']
                model_features = pkl_data.get('features', None)
            else:
                model = pkl_data
                model_features = None
            model_name_loaded = path.name
            print(f"[OK] Modelo cargado exitosamente: {path}")
            if model_features:
                print(f"[OK] Features del modelo: {model_features}")
            break
        except Exception as e:
            print(f"[ERROR] No se pudo cargar el modelo {path}: {e}")

if model is None:
    print("[ADVERTENCIA] No se pudo cargar ningún modelo. El servicio responderá con predicciones simuladas.")

# Lista ordenada de variables MDI — se usa la del modelo si está disponible, si no la por defecto
FEATURES_ORDER = model_features if model_features else [
    'promedio_general', 'promedio_actual', 'asistencia_promedio', 'materias_reprobadas',
    'materias_recursadas', 'materias_inscritas', 'materias_aprobadas', 'cuatrimestre_actual',
    'cuatrimestres_retraso', 'parciales_reprobados', 'calificacion_minima_parcial', 'calificacion_maxima_parcial',
    'beneficiario_beca', 'turno', 'preferencia_carrera', 'foraneo', 'trabaja', 'edad_ingreso'
]

class PredictionInput(BaseModel):
    promedio_general: float
    promedio_actual: float
    asistencia_promedio: float
    materias_reprobadas: int
    materias_recursadas: int
    materias_inscritas: int
    materias_aprobadas: int
    cuatrimestre_actual: int
    cuatrimestres_retraso: int
    parciales_reprobados: int
    calificacion_minima_parcial: float
    calificacion_maxima_parcial: float
    beneficiario_beca: int  # 0 o 1
    turno: int              # 0, 1, 2 o 3
    preferencia_carrera: int # 0, 1 o 2
    foraneo: int            # 0 o 1
    trabaja: int            # 0 o 1
    edad_ingreso: int

@app.get("/status")
def get_status():
    return {
        "status": "online",
        "model_loaded": model is not None,
        "model_name": model_name_loaded
    }

@app.post("/predict")
def predict(data: PredictionInput):
    # 1. Fallback si el modelo no está cargado
    if model is None:
        # Calcular un riesgo mock razonable en base a materias reprobadas y asistencia
        reprobadas = data.materias_reprobadas
        asist = data.asistencia_promedio
        # Si la asistencia viene como 0-100, la normalizamos a 0-1
        if asist > 1.0:
            asist = asist / 100.0

        score = (reprobadas * 0.2) + (1.0 - asist) * 0.5
        prob = min(max(score, 0.0), 1.0)
        deserta = 1 if prob > 0.5 else 0
        risk = "riesgo_critico" if prob > 0.70 else ("riesgo_moderado" if prob > 0.40 else ("alerta_temprana" if prob > 0.20 else "estable"))
        
        return {
            "success": True,
            "deserta": deserta,
            "probabilidad_desercion": round(prob, 4),
            "estado_riesgo": risk,
            "simulado": True
        }

    try:
        # Convertir datos a dict y formatear asistencia si viene de 0 a 100 en vez de 0.0 a 1.0
        dict_data = data.model_dump()
        if dict_data['asistencia_promedio'] > 1.0:
            dict_data['asistencia_promedio'] = dict_data['asistencia_promedio'] / 100.0

        # Crear DataFrame ordenado según las columnas de entrenamiento
        df_input = pd.DataFrame([dict_data])[FEATURES_ORDER]

        # Realizar la predicción
        pred_label = int(model.predict(df_input)[0])
        probabilities = model.predict_proba(df_input)[0]
        prob_desercion = float(probabilities[1])

        # Determinar nivel de riesgo según los umbrales estándar del sistema
        if prob_desercion > 0.70:
            risk = "riesgo_critico"
        elif prob_desercion > 0.40:
            risk = "riesgo_moderado"
        elif prob_desercion > 0.20:
            risk = "alerta_temprana"
        else:
            risk = "estable"

        return {
            "success": True,
            "deserta": pred_label,
            "probabilidad_desercion": round(prob_desercion, 4),
            "estado_riesgo": risk,
            "simulado": False,
            "model_used": model_name_loaded
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en la predicción del modelo: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api_ia:app", host="0.0.0.0", port=8000, reload=True)
