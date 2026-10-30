# No ingresó / Revertir contratación

En **Selección → Vacante → Candidatos**, abre la ficha de una persona en **Seleccionado - Contratar** y pulsa **No ingresó / Revertir contratación**. La vista de lista de candidatos de la vacante ofrece la misma acción.

La acción requiere permisos para **actualizar Selección** y **eliminar Empleados** en la empresa, además del acceso al centro y a la requisición si es confidencial. Los administradores mantienen su acceso habitual. La validación definitiva ocurre en el servidor.

1. Revisa la identidad, la vacante, los documentos que se conservarán y el contrato sin aprobar que se eliminará.
2. Escribe un motivo de entre 10 y 2000 caracteres y el número de documento del candidato.
3. Marca la confirmación de que no inició labores y pulsa **Confirmar reversión**.

El candidato queda **Retirado**, con el motivo «No ingresó» y la explicación registrada. Se elimina el empleado provisional y sus registros de preparación, incluido su contrato sin aprobar. Los documentos pasan al expediente del candidato conservando sus referencias a los archivos originales; los archivos no se borran. Las etapas de selección permanecen intactas. La vacante vuelve a **En Proceso**, salvo que tenga otro candidato contratado, en cuyo caso conserva su estado.

La ficha muestra un historial permanente con responsable, fecha, motivo, contratos y número de documentos conservados. Auditoría registra la operación y un archivo privado conserva la copia de los registros anteriores, sin exponer información laboral completa en la interfaz.

## Casos que requieren revisión manual

La operación se bloquea si el empleado procede de un reingreso, tiene ciclos anteriores, está en retiro, su identidad no coincide, existe un contrato aprobado o con documento generado, hay prórrogas, actividad laboral, nómina, marcaciones, retiros, vacaciones utilizadas o cualquier vínculo no previsto. Una vacante cerrada, cancelada, pausada o con colocado también requiere revisión.

Los cambios son atómicos: si una validación falla, no se revierte parcialmente la contratación. Si la información cambió desde la revisión, se exige cerrar y abrir la ventana para verificarla de nuevo. Los reintentos de la misma operación no duplican documentos ni comprobantes.

## Instalación y verificación

Aplicar `supabase/migrations/20261030125953_revert_candidate_no_show.sql` antes de publicar la interfaz. La migración crea las funciones RPC, el comprobante con RLS y el archivo privado. No modifica contrataciones existentes.

Pruebas de interfaz:

```powershell
npx vitest run src/components/selection/HiringReversalDialog.test.tsx
```

Pruebas de integración en una base local con el esquema del proyecto:

```powershell
Get-Content -Raw supabase/tests/candidate_hiring_reversal.sql | docker exec -i supabase_db_krh-web psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres
```

Las pruebas SQL usan datos sintéticos y terminan con `ROLLBACK`.
