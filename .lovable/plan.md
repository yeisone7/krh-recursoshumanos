

# Traslado Inter-Empresa de Empleados

## Resumen

Crear un flujo de "Traslado entre Empresas" que permita mover un empleado de una empresa a otra, ejecutando el retiro completo en la empresa origen, copiando automáticamente los datos personales a la empresa destino y manteniendo la misma cuenta de usuario.

## Flujo del Proceso

```text
Empresa Origen                         Empresa Destino
─────────────────                      ─────────────────
1. Admin inicia "Traslado"
2. Selecciona empresa destino
3. Se ejecuta retiro completo
   (acta, liquidación, etc.)
4. Empleado queda "Retirado"
                                       5. Se crea nuevo registro
                                          con datos copiados
                                       6. Cuenta de usuario se
                                          reasigna a nueva empresa
7. Registro de traslado vincula
   ambos empleados
```

## Cambios en Base de Datos

**Nueva tabla `employee_transfers`:**
- `id`, `created_at`, `created_by`
- `source_company_id` — empresa origen
- `target_company_id` — empresa destino
- `source_employee_id` — registro del empleado en origen
- `target_employee_id` — nuevo registro creado en destino
- `transfer_date` — fecha del traslado
- `termination_id` — referencia al proceso de retiro en origen
- `status` — (pending, completed, cancelled)
- `notes` — observaciones

RLS: acceso para miembros de cualquiera de las dos empresas involucradas.

## Cambios en el Frontend

### 1. Nuevo componente `TransferEmployeeDialog`
- Se accede desde el menú de acciones del empleado (o desde el perfil)
- Paso 1: Seleccionar empresa destino (dropdown con todas las empresas disponibles)
- Paso 2: Confirmar datos a copiar (nombre, documento, contacto, seguridad social, familia, banco)
- Paso 3: Confirmar y ejecutar

### 2. Hook `useEmployeeTransfer`
- Crea el registro en `employee_transfers` con status `pending`
- Copia datos del empleado a la nueva empresa (inserta en `employees_v2`, `employee_contact`, `employee_social_security`, `employee_family`, `employee_bank_info`)
- Reasigna la cuenta de usuario: agrega `user_company_assignments` para la empresa destino
- Actualiza status a `completed`
- Registra evento de auditoría

### 3. Indicador visual
- Badge "Trasladado" en el perfil del empleado retirado por traslado
- Link al nuevo registro en la empresa destino desde el historial

### 4. Integración con retiro existente
- El proceso de retiro se ejecuta de forma estándar (ya existe `TerminationProcessDialog`)
- El traslado se inicia **después** de completar el retiro, o como parte del mismo flujo si se prefiere

## Detalle Técnico

- Los datos copiados son: información personal (`employees_v2`), contacto (`employee_contact`), seguridad social (`employee_social_security`), familia (`employee_family`), información bancaria (`employee_bank_info`)
- NO se copian: contratos, turnos, nómina, procesos disciplinarios (pertenecen a la empresa origen)
- La información laboral (`employee_work_info`) NO se copia — se debe crear nueva en la empresa destino (nuevo cargo, centro, área)
- La cuenta de usuario mantiene acceso a ambas empresas temporalmente; el admin puede remover el acceso a la empresa origen después si lo desea

## Archivos Involucrados

| Archivo | Acción |
|---|---|
| Migración SQL | Crear tabla `employee_transfers` con RLS |
| `src/hooks/useEmployeeTransfer.ts` | Crear — lógica del traslado |
| `src/components/employees/TransferEmployeeDialog.tsx` | Crear — UI del traslado |
| `src/components/employees/EmployeeDetail.tsx` (o similar) | Editar — agregar opción de traslado en menú |
| `src/hooks/useAdminUsers.ts` | Sin cambios (reasignación de empresa ya existe) |

