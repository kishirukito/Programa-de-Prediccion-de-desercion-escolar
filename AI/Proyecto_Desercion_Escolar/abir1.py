import joblib
import pandas as pd
import os
import numpy as np
import time as tm
from sklearn.model_selection import train_test_split

# Cargar modelo y features
data = joblib.load('modelos/random_forest_base.pkl')
modelo = data['modelo']
features = data['features']

def crear_estudiante(tipo):
    """
    Crea un estudiante con características específicas
    tipo: 'desercion', 'no_desercion' o 'punto_medio'
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
    elif tipo == 'punto_medio':
        # Estudiantes con riesgo moderado de deserción
        return {
            'promedio_general': np.random.uniform(6.5, 7.8),
            'promedio_actual': np.random.uniform(6.0, 7.5),
            'asistencia_promedio': np.random.uniform(0.65, 0.85),
            'materias_reprobadas': np.random.randint(1, 3),
            'materias_recursadas': np.random.randint(0, 2),
            'materias_inscritas': np.random.randint(4, 6),
            'materias_aprobadas': np.random.randint(2, 4),
            'cuatrimestre_actual': np.random.randint(3, 6),
            'cuatrimestres_retraso': np.random.randint(0, 2),
            'parciales_reprobados': np.random.randint(1, 3),
            'calificacion_minima_parcial': np.random.uniform(5.0, 6.5),
            'calificacion_maxima_parcial': np.random.uniform(7.5, 9.0),
            'beneficiario_beca': np.random.choice([0, 1], p=[0.5, 0.5]),
            'turno': np.random.choice([0, 1, 2], p=[0.4, 0.4, 0.2]),
            'preferencia_carrera': np.random.choice([0, 1, 2], p=[0.45, 0.35, 0.2]),
            'foraneo': np.random.choice([0, 1], p=[0.6, 0.4]),
            'trabaja': np.random.choice([0, 1], p=[0.5, 0.5]),
            'edad_ingreso': np.random.randint(18, 24)
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

# Generar 30 estudiantes (10 deserción, 10 punto medio, 10 no deserción)
estudiantes = []
tipos_esperados = []

# 10 estudiantes con deserción
for i in range(10):
    estudiantes.append(crear_estudiante('desercion'))
    tipos_esperados.append('DESERCIÓN')

# 10 estudiantes en punto medio
for i in range(10):
    estudiantes.append(crear_estudiante('punto_medio'))
    tipos_esperados.append('PUNTO MEDIO')

# 10 estudiantes sin deserción
for i in range(10):
    estudiantes.append(crear_estudiante('no_desercion'))
    tipos_esperados.append('NO DESERCIÓN')


def exportar_excel():
    try:
        # Generar timestamp
        hora = tm.strftime("%Y%m%d_%H%M%S")
        
        # Definir ruta
        #nombre_ruta = r"AI/Proyecto_Desercion_Escolar/resutados_prueba/base"
        nombre_ruta = r"C:\Users\ios27\OneDrive\Escritorio\Codigo\AI\Proyecto_Desercion_Escolar\resutados_prueba\base"
        
        # Nombre del archivo
        nombre_archivo = f'estudiantes_base_{hora}.xlsx'
        ruta = os.path.join(nombre_ruta, nombre_archivo)
        
        # Exportar
        df_estudiantes.to_excel(ruta, header=True, index=False)
        
        print(f"Archivo exportado exitosamente: {ruta}")
        return ruta
        
    except Exception as e:
        print(f"Error al exportar: {e}")
        return None

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
print("CARACTERISTICAS DE LOS ESTUDIANTES")
print("=" * 80)
print(df_estudiantes)   
print("\n" + "=" * 80)
exportar_excel()

print("\n" + "=" * 80)
print("📋 LISTA RESUMIDA DE PREDICCIONES PARA 30 ESTUDIANTES")
print("=" * 80)
print(f"{'#':^4} | {'TIPO ESPERADO':^15} | {'PREDICCIÓN':^15} | {'PROB. DESERCIÓN':^12} | {'ESTADO':^10}")
print("-" * 80)

# Listas para almacenar resultados
estudiantes_desertaran = []
estudiantes_no_desertaran = []
estudiantes_punto_medio = []

for i in range(len(estudiantes)):
    pred = 'DESERCIÓN' if predicciones[i] == 1 else 'NO DESERCIÓN'
    prob_desercion = probabilidades[i][1] * 100
    
    # Clasificar según predicción y tipo esperado
    if pred == 'DESERCIÓN':
        estudiantes_desertaran.append(i + 1)
        estado = "🔴 DESERTARÁ"
    else:
        estudiantes_no_desertaran.append(i + 1)
        estado = "🟢 NO DESERTARÁ"
    
    # Identificar punto medio
    if tipos_esperados[i] == 'PUNTO MEDIO':
        estudiantes_punto_medio.append(i + 1)
    
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

print(f"\n✅ ESTUDIANTES EN PUNTO MEDIO (según tipo esperado):")
print(f"   {len(estudiantes_punto_medio)} estudiantes: {estudiantes_punto_medio}")
if estudiantes_punto_medio:
    print(f"   Números: {', '.join(map(str, estudiantes_punto_medio))}")
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
print(f"🟡 PUNTO MEDIO (esperado): {estudiantes_punto_medio}")

# =====================================================
# DICCIONARIO CON TODOS LOS RESULTADOS
# =====================================================
resultados = {
    'estudiantes_desertaran': estudiantes_desertaran,
    'estudiantes_no_desertaran': estudiantes_no_desertaran,
    'estudiantes_punto_medio': estudiantes_punto_medio,
    'total_desertaran': len(estudiantes_desertaran),
    'total_no_desertaran': len(estudiantes_no_desertaran),
    'total_punto_medio': len(estudiantes_punto_medio)
}

print("\n" + "=" * 80)
print("📦 DICCIONARIO DE RESULTADOS:")
print("=" * 80)
for key, value in resultados.items():
    print(f"  {key}: {value}")

# =====================================================
# ANÁLISIS DE PRECISIÓN
# =====================================================
# Calcular precisión para cada categoría
aciertos_desercion = sum(1 for i in range(10) if predicciones[i] == 1)
aciertos_punto_medio = sum(1 for i in range(10, 20) if predicciones[i] == 1)
aciertos_no_desercion = sum(1 for i in range(20, 30) if predicciones[i] == 0)

print("\n" + "=" * 80)
print("🎯 PRECISIÓN DEL MODELO POR CATEGORÍA:")
print("=" * 80)
print(f"  Deserción: {aciertos_desercion}/10 = {aciertos_desercion/10*100:.2f}%")
print(f"  Punto Medio: {aciertos_punto_medio}/10 = {aciertos_punto_medio/10*100:.2f}% (predichos como deserción)")
print(f"  No Deserción: {aciertos_no_desercion}/10 = {aciertos_no_desercion/10*100:.2f}%")

# Mostrar matriz de confusión
print("\n📊 MATRIZ DE CONFUSIÓN (Agrupada):")
print("-" * 50)
print("                   REAL")
print("            DESERCIÓN  P.MEDIO  NO DES.")
print(f"PRED  DESERCIÓN    {aciertos_desercion:^7}   {aciertos_punto_medio:^7}   {10 - aciertos_no_desercion:^7}")
print(f"      NO DESER.   {10 - aciertos_desercion:^7}   {10 - aciertos_punto_medio:^7}   {aciertos_no_desercion:^7}")
print("-" * 50)

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
lista_punto_medio = estudiantes_punto_medio

# Ejemplo de cómo usar las listas:
print("\n💡 EJEMPLO DE USO DE LAS LISTAS:")
print(f"   Los estudiantes que desertarán son: {lista_desertaran}")
print(f"   Los estudiantes que NO desertarán son: {lista_no_desertaran}")
print(f"   Los estudiantes en punto medio son: {lista_punto_medio}")

# Análisis adicional de punto medio
print("\n📊 ANÁLISIS DE ESTUDIANTES EN PUNTO MEDIO:")
print("=" * 80)
for i in range(10, 20):  # Estudiantes 11-20 (punto medio)
    prob = probabilidades[i][1] * 100
    pred = 'DESERCIÓN' if predicciones[i] == 1 else 'NO DESERCIÓN'
    print(f"   Estudiante {i+1}: Predicción = {pred}, Probabilidad = {prob:.2f}%")