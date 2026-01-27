
# Plan: Completar datos dinámicos para generación de contratos

## Resumen

Agregar los campos faltantes para que la plantilla DOCX pueda inyectar toda la información solicitada del empleado y contrato.

## Cambios Necesarios

### 1. Actualizar la interfaz ContractDocumentData

Agregar el campo para el término inicial del contrato:

```typescript
// En src/lib/contractDocumentGenerator.ts
export interface ContractDocumentData {
  // ... campos existentes ...
  
  // Nuevo campo
  contractDurationMonths?: number; // Término inicial en meses
}
```

### 2. Agregar nuevo placeholder en prepareTemplateData

```typescript
// Nuevo placeholder para término inicial
CONTRATO_DURACION_MESES: data.contractDurationMonths 
  ? `${data.contractDurationMonths} meses` 
  : 'Indefinido',
```

### 3. Modificar GenerateContractDialog para obtener datos completos del empleado

Actualmente el diálogo solo recibe datos básicos del empleado. Se debe:

- Hacer una consulta adicional a `employee_contact` para obtener: email, telefono, direccion
- Hacer una consulta adicional a `employee_work_info` para obtener: cargo (position_name), centro de operacion

### 4. Calcular el término inicial automáticamente

Agregar función para calcular meses entre fecha inicio y fecha fin:

```typescript
function calculateMonthsDifference(startDate: Date, endDate: Date): number {
  const months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
  return months + endDate.getMonth() - startDate.getMonth();
}
```

## Archivos a Modificar

1. **src/lib/contractDocumentGenerator.ts**
   - Agregar `contractDurationMonths` a la interfaz
   - Agregar placeholder `CONTRATO_DURACION_MESES`
   - Agregar funcion `calculateMonthsDifference`

2. **src/components/contracts/GenerateContractDialog.tsx**
   - Agregar consulta a `employee_contact` para obtener email, telefono, direccion
   - Agregar consulta a `employee_work_info` para obtener cargo real
   - Pasar los nuevos datos a `prepareDocumentData`
   - Calcular duracion del contrato en meses

## Lista Final de Placeholders

Despues de implementar, tu plantilla Word podra usar:

| Placeholder | Descripcion |
|-------------|-------------|
| `{{EMPRESA_NOMBRE}}` | Nombre de la empresa |
| `{{EMPRESA_DIRECCION}}` | Domicilio del empleador |
| `{{EMPRESA_NIT}}` | NIT de la empresa |
| `{{EMPLEADO_NOMBRE_COMPLETO}}` | Nombre completo del trabajador |
| `{{EMPLEADO_DOCUMENTO}}` | Numero de identificacion |
| `{{EMPLEADO_TIPO_DOCUMENTO}}` | Tipo de documento (C.C., etc.) |
| `{{EMPLEADO_EMAIL}}` | Correo electronico del trabajador |
| `{{EMPLEADO_DIRECCION}}` | Direccion de residencia |
| `{{EMPLEADO_TELEFONO}}` | Telefono del trabajador |
| `{{EMPLEADO_CARGO}}` | Cargo del empleado |
| `{{EMPLEADO_CENTRO_OPERACION}}` | Centro de operaciones |
| `{{CONTRATO_SALARIO}}` | Salario formateado ($2.500.000) |
| `{{CONTRATO_SALARIO_LETRAS}}` | Salario en letras |
| `{{CONTRATO_FECHA_INICIO}}` | Fecha inicio (dd/mm/yyyy) |
| `{{CONTRATO_FECHA_INICIO_LETRAS}}` | Fecha inicio en palabras |
| `{{CONTRATO_DURACION_MESES}}` | Termino inicial (ej: "12 meses") |
| `{{CONTRATO_FECHA_FIN}}` | Fecha fin del contrato |
| `{{CONTRATO_FECHA_FIN_LETRAS}}` | Fecha fin en palabras |
| `{{FECHA_GENERACION_LETRAS}}` | Fecha de generacion del documento |
| `{{CIUDAD_GENERACION}}` | Ciudad donde se genera |

## Ejemplo de Uso en Plantilla

```text
CONTRATO DE TRABAJO

Entre {{EMPRESA_NOMBRE}}, con domicilio en {{EMPRESA_DIRECCION}}, 
identificada con NIT {{EMPRESA_NIT}}, y {{EMPLEADO_NOMBRE_COMPLETO}}, 
identificado con {{EMPLEADO_TIPO_DOCUMENTO}} No. {{EMPLEADO_DOCUMENTO}}, 
residente en {{EMPLEADO_DIRECCION}}, telefono {{EMPLEADO_TELEFONO}}, 
correo {{EMPLEADO_EMAIL}}.

CARGO: {{EMPLEADO_CARGO}}
CENTRO DE OPERACIONES: {{EMPLEADO_CENTRO_OPERACION}}
SALARIO: {{CONTRATO_SALARIO}} ({{CONTRATO_SALARIO_LETRAS}})
FECHA DE INICIO: {{CONTRATO_FECHA_INICIO_LETRAS}}
DURACION: {{CONTRATO_DURACION_MESES}}

Firmado en {{CIUDAD_GENERACION}}, {{FECHA_GENERACION_LETRAS}}.
```

## Como Subir la Plantilla

1. Ir a Configuracion > Tipos de Contrato
2. Editar el tipo de contrato deseado
3. En la seccion "Plantilla de Contrato", subir el archivo .docx
4. El sistema asociara automaticamente la plantilla al tipo de contrato
