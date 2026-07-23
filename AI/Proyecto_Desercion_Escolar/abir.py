import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split

# Cargar modelo y features
data = joblib.load('modelos/random_forest_optimizado.pkl')
modelo = data['modelo']
features = data['features']

def crear_estudiante(tipo):
    """
    Crea un estudiante con características específicas
    tipo: 'desercion' o 'no_desercion'
    """
    if tipo == 'desercion':
        # Estudiantes con alto riesgo de deserción
        return {
            'promedio_general': np.random.uniform(4.0, 7.0),
            'promedio_actual': np.random.uniform(4.0, 6.5),
            'asistencia_promedio': np.random.uniform(0.3, 0.7),
            'materias_reprobadas': np.random.randint(3, 6),
            'materias_recursadas': np.random.randint(2, 5),
            'materias_inscritas': np.random.randint(3, 5),
            'materias_aprobadas': np.random.randint(1, 3),
            'cuatrimestre_actual': np.random.randint(4, 8),
            'cuatrimestres_retraso': np.random.randint(2, 5),
            'parciales_reprobados': np.random.randint(3, 6),
            'calificacion_minima_parcial': np.random.uniform(3.0, 5.5),
            'calificacion_maxima_parcial': np.random.uniform(6.0, 8.0),
            'beneficiario_beca': np.random.choice([0, 1], p=[0.7, 0.3]),
            'turno': np.random.choice([0, 1, 2], p=[0.3, 0.5, 0.2]),
            'preferencia_carrera': np.random.choice([0, 1, 2], p=[0.4, 0.4, 0.2]),
            'foraneo': np.random.choice([0, 1], p=[0.5, 0.5]),
            'trabaja': np.random.choice([0, 1], p=[0.3, 0.7]),
            'edad_ingreso': np.random.randint(19, 26)
        }
    else:  # no_desercion
        # Estudiantes con bajo riesgo de deserción
        return {
            'promedio_general': np.random.uniform(7.5, 9.5),
            'promedio_actual': np.random.uniform(7.0, 9.0),
            'asistencia_promedio': np.random.uniform(0.75, 1.0),
            'materias_reprobadas': np.random.randint(0, 2),
            'materias_recursadas': np.random.randint(0, 1),
            'materias_inscritas': np.random.randint(5, 7),
            'materias_aprobadas': np.random.randint(4, 6),
            'cuatrimestre_actual': np.random.randint(2, 5),
            'cuatrimestres_retraso': np.random.randint(0, 1),
            'parciales_reprobados': np.random.randint(0, 2),
            'calificacion_minima_parcial': np.random.uniform(6.0, 8.0),
            'calificacion_maxima_parcial': np.random.uniform(8.5, 10.0),
            'beneficiario_beca': np.random.choice([0, 1], p=[0.2, 0.8]),
            'turno': np.random.choice([0, 1, 2], p=[0.6, 0.3, 0.1]),
            'preferencia_carrera': np.random.choice([0, 1, 2], p=[0.5, 0.3, 0.2]),
            'foraneo': np.random.choice([0, 1], p=[0.7, 0.3]),
            'trabaja': np.random.choice([0, 1], p=[0.8, 0.2]),
            'edad_ingreso': np.random.randint(18, 22)
        }

# Generar 20 estudiantes (10 deserción, 10 no deserción)
estudiantes = []
tipos_esperados = []

# 10 estudiantes con deserción
for i in range(10):
    estudiantes.append(crear_estudiante('desercion'))
    tipos_esperados.append('DESERCIÓN')

# 10 estudiantes sin deserción
for i in range(10):
    estudiantes.append(crear_estudiante('no_desercion'))
    tipos_esperados.append('NO DESERCIÓN')

# Crear DataFrame
df_estudiantes = pd.DataFrame(estudiantes)

# Asegurar el orden correcto de características
df_estudiantes = df_estudiantes[features]

# Hacer predicciones
predicciones = modelo.predict(df_estudiantes)
probabilidades = modelo.predict_proba(df_estudiantes)

# =====================================================
# LISTA RESUMIDA DE ESTUDIANTES (RESULTADO FINAL)
# =====================================================
print("\n" + "=" * 80)
print("📋 LISTA RESUMIDA DE PREDICCIONES PARA 20 ESTUDIANTES")
print("=" * 80)
print(f"{'#':^4} | {'TIPO ESPERADO':^15} | {'PREDICCIÓN':^15} | {'PROB. DESERCIÓN':^12} | {'ESTADO':^10}")
print("-" * 80)

# Listas para almacenar resultados
estudiantes_desertaran = []
estudiantes_no_desertaran = []

for i in range(len(estudiantes)):
    pred = 'DESERCIÓN' if predicciones[i] == 1 else 'NO DESERCIÓN'
    prob_desercion = probabilidades[i][1] * 100
    
    # Clasificar según predicción
    if pred == 'DESERCIÓN':
        estudiantes_desertaran.append(i + 1)
        estado = "🔴 DESERTARÁ"
    else:
        estudiantes_no_desertaran.append(i + 1)
        estado = "🟢 NO DESERTARÁ"
    
    # Mostrar fila resumida
    print(f"{i+1:^4} | {tipos_esperados[i]:^15} | {pred:^15} | {prob_desercion:^11.2f}% | {estado:^10}")

print("-" * 80)

# =====================================================
# RESUMEN FINAL CON LISTAS
# =====================================================
print("\n" + "=" * 80)
print("📊 RESUMEN FINAL")
print("=" * 80)

print(f"\n✅ ESTUDIANTES QUE DESERTARÁN (según predicción):")
print(f"   {len(estudiantes_desertaran)} estudiantes: {estudiantes_desertaran}")
if estudiantes_desertaran:
    print(f"   Números: {', '.join(map(str, estudiantes_desertaran))}")
else:
    print("   Ningún estudiante")

print(f"\n✅ ESTUDIANTES QUE NO DESERTARÁN (según predicción):")
print(f"   {len(estudiantes_no_desertaran)} estudiantes: {estudiantes_no_desertaran}")
if estudiantes_no_desertaran:
    print(f"   Números: {', '.join(map(str, estudiantes_no_desertaran))}")
else:
    print("   Ningún estudiante")

# =====================================================
# LISTA SIMPLE (SOLO NÚMEROS)
# =====================================================
print("\n" + "=" * 80)
print("📌 LISTA SIMPLE DE ESTUDIANTES POR CATEGORÍA")
print("=" * 80)
print(f"🔴 DESERCIÓN: {estudiantes_desertaran}")
print(f"🟢 NO DESERCIÓN: {estudiantes_no_desertaran}")

# =====================================================
# DICCIONARIO CON TODOS LOS RESULTADOS
# =====================================================
resultados = {
    'estudiantes_desertaran': estudiantes_desertaran,
    'estudiantes_no_desertaran': estudiantes_no_desertaran,
    'total_desertaran': len(estudiantes_desertaran),
    'total_no_desertaran': len(estudiantes_no_desertaran)
}

print("\n" + "=" * 80)
print("📦 DICCIONARIO DE RESULTADOS:")
print("=" * 80)
for key, value in resultados.items():
    print(f"  {key}: {value}")

# =====================================================
# ANÁLISIS DE PRECISIÓN
# =====================================================
aciertos = sum(1 for i in range(len(estudiantes)) if 
               (predicciones[i] == 1 and tipos_esperados[i] == 'DESERCIÓN') or 
               (predicciones[i] == 0 and tipos_esperados[i] == 'NO DESERCIÓN'))

print("\n" + "=" * 80)
print(f"🎯 PRECISIÓN DEL MODELO: {aciertos/20 * 100:.2f}% ({aciertos}/20 aciertos)")
print("=" * 80)

# Mostrar matriz de confusión simple
print("\n📊 MATRIZ DE CONFUSIÓN:")
print("-" * 40)
print("                 REAL")
print("              DESERCIÓN  NO DESERCIÓN")
print(f"PREDICCIÓN  DESERCIÓN     {sum(1 for i in range(10) if predicciones[i] == 1):^5}      {sum(1 for i in range(10,20) if predicciones[i] == 1):^5}")
print(f"           NO DESERCIÓN   {sum(1 for i in range(10) if predicciones[i] == 0):^5}      {sum(1 for i in range(10,20) if predicciones[i] == 0):^5}")
print("-" * 40)

# =====================================================
# LISTA FINAL CON FORMATO CSV (para copiar)
# =====================================================
print("\n" + "=" * 80)
print("📋 LISTA FINAL EN FORMATO CSV:")
print("=" * 80)
print("Estudiante,Tipo_Esperado,Prediccion,Prob_Desercion")
for i in range(len(estudiantes)):
    pred = 'DESERCIÓN' if predicciones[i] == 1 else 'NO DESERCIÓN'
    prob = f"{probabilidades[i][1] * 100:.2f}%"
    print(f"{i+1},{tipos_esperados[i]},{pred},{prob}")

print("\n" + "=" * 80)
print("FIN DEL ANÁLISIS")
print("=" * 80)

# =====================================================
# ACCESO RÁPIDO A LAS LISTAS (para usar en otras partes)
# =====================================================
# Estas variables contienen las listas que puedes usar después
lista_desertaran = estudiantes_desertaran
lista_no_desertaran = estudiantes_no_desertaran

# Ejemplo de cómo usar las listas:
print("\n💡 EJEMPLO DE USO DE LAS LISTAS:")
print(f"   Los estudiantes que desertarán son: {lista_desertaran}")
print(f"   Los estudiantes que NO desertarán son: {lista_no_desertaran}")