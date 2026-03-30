

## Plan: Mostrar porcentaje de empleados por centro

### Resumen
Agregar el porcentaje que representa cada centro del total de empleados activos de la empresa, mostrado junto al conteo actual en el header de cada tarjeta.

### Cambios

**1. `src/pages/CentrosFichas.tsx`**
- Consultar el total de empleados activos de la empresa (query a `employee_work_info` con `is_current = true`, filtrando por centros de la empresa)
- Pasar `companyTotalEmployees` como prop a cada `CenterAnalyticalCard`

**2. `src/components/centers/CenterAnalyticalCard.tsx`**
- Recibir nueva prop `companyTotalEmployees: number`
- En el header, debajo del número de empleados, mostrar el porcentaje: `(X.X%)` calculado como `(totalEmployees / companyTotalEmployees * 100)`
- Mostrar "—" mientras carga o si el total es 0

### Diseño visual
En el header de la tarjeta, donde actualmente se ve:
```text
  0
EMPLEADOS
```
Se mostrará:
```text
  0
 0.0%
EMPLEADOS
```
El porcentaje se muestra en texto más pequeño y color secundario.

