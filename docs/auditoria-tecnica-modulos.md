# Auditoria tecnica por modulos

Fecha: 2026-06-17

## Alcance

Revision estatica del frontend React/Vite, hooks de datos, rutas, permisos, Edge Functions y estructura Supabase. No se ejecutaron pruebas ni build porque el workspace no tiene dependencias instaladas (`vite`, `eslint` y `vitest` no estan disponibles localmente).

## Resumen ejecutivo

EmpatiQ es una aplicacion empresarial amplia y funcionalmente madura. La arquitectura principal esta bien orientada por dominios: rutas protegidas, permisos por modulo, hooks por area de negocio, Edge Functions para procesos privilegiados y PWA para distribucion.

El principal riesgo no es falta de funcionalidad, sino acumulacion de complejidad en piezas grandes: hooks que orquestan muchas tablas, componentes de formulario de mas de 1.000 lineas, duplicidad de migraciones y funciones con `service_role` que requieren validacion estricta. El sistema esta en un punto donde conviene ordenar antes de seguir agregando modulos al mismo ritmo.

## Hallazgos prioritarios

### P0 - Funciones privilegiadas expuestas sin validacion fuerte

Algunas Edge Functions usan `SUPABASE_SERVICE_ROLE_KEY` y no validan usuario con Supabase Auth. Esto no implica automaticamente una vulnerabilidad explotable, pero si eleva el riesgo porque el service role ignora RLS.

Evidencia:

- `ai-text-to-speech` usa service role para leer `system_config` y llama a OpenAI sin validar usuario: `supabase/functions/ai-text-to-speech/index.ts:9`, `supabase/functions/ai-text-to-speech/index.ts:25`, `supabase/functions/ai-text-to-speech/index.ts:30`.
- `twilio-whatsapp-status` actualiza entregas con service role usando `deliveryId` o `MessageSid`, sin validar firma de Twilio: `supabase/functions/twilio-whatsapp-status/index.ts:15`, `supabase/functions/twilio-whatsapp-status/index.ts:26`, `supabase/functions/twilio-whatsapp-status/index.ts:54`.
- Funciones de notificacion programada como `notify-contract-preaviso`, `notify-incapacity-alerts` y `notify-pending-terminations` parecen pensadas para cron, pero la auditoria no encontro un secreto compartido tipo `CRON_SECRET`.

Recomendacion:

- Exigir JWT y permiso de modulo para funciones invocadas desde UI.
- Para webhooks, validar firma del proveedor.
- Para cron/jobs, exigir secreto de invocacion o restringir desde plataforma.
- Mantener service role solo despues de validar identidad, pertenencia a empresa y permiso de accion.

### P1 - Duplicidad de fuente Supabase

Existen dos arboles de backend: `supabase/` y `supabase_backend_package/supabase/`. El proyecto principal tiene 219 migraciones y el paquete backend 132 migraciones. Esto puede causar drift, despliegues parciales y dificultad para saber cual es la fuente de verdad.

Recomendacion:

- Definir una unica fuente canonica para migraciones y Edge Functions.
- Convertir el paquete backend en artefacto generado o eliminarlo del flujo principal.
- Agregar una verificacion CI que compare funciones/migraciones desplegables contra la fuente canonica.

### P1 - Orquestacion critica desde el cliente

Varios hooks ejecutan procesos multi-tabla directamente desde el navegador. Aunque RLS proteja datos, las operaciones complejas quedan repartidas y son mas dificiles de hacer atomicas.

Evidencia por complejidad:

- `useEmployees.ts`: 1051 lineas, 15 tablas, 28 escrituras.
- `useCandidates.ts`: 1043 lineas, 18 tablas, 22 escrituras.
- `useTraining.ts`: 1071 lineas, 9 tablas, 20 escrituras.
- `useSchedules.ts`: 638 lineas, 6 tablas, 20 escrituras.
- `useDisciplinaryProcesses.ts`: 600 lineas, 4 tablas, 16 escrituras.

Recomendacion:

- Mover flujos transaccionales a RPC o Edge Functions: contratacion desde candidato, creacion completa de empleado, transferencias, retiros, ciclos de jornada, inventario de dotacion.
- Dejar en frontend operaciones CRUD simples y validaciones de experiencia.

### P1 - Componentes demasiado grandes para mantenimiento seguro

Hay pantallas y dialogos con demasiada responsabilidad. Esto aumenta riesgo de regresion visual y logica cada vez que se toca un flujo.

Archivos destacados:

- `src/components/employees/EmployeeFormDialog.tsx`: 2048 lineas.
- `src/components/notifications/NotificationEngineManager.tsx`: 1672 lineas.
- `src/components/vacancies/VacancyDetailDialog.tsx`: 1351 lineas.
- `src/pages/AnaliticaNomina.tsx`: 1813 lineas.
- `src/pages/AnaliticaSeleccion.tsx`: 1738 lineas.
- `src/pages/RegistroPublico.tsx`: 1389 lineas.

Recomendacion:

- Partir por subcomponentes de seccion, no por abstracciones genericas.
- Extraer transformaciones de datos y calculos a `lib/` o hooks pequenos.
- Crear pruebas de humo por flujo antes de refactorizar.

## Modulos

### Autenticacion, empresas y permisos

Base solida: `AuthContext` centraliza sesion, empresas, roles, permisos y perfil. `PermissionRoute` protege rutas y `Sidebar` filtra navegacion por permisos.

Evidencia:

- Carga de datos de usuario: `src/contexts/AuthContext.tsx:103`.
- Validacion de permisos: `src/contexts/AuthContext.tsx:273`.
- Proteccion de ruta: `src/components/auth/PermissionRoute.tsx:16`.
- Bypass admin: `src/components/auth/PermissionRoute.tsx:20`.
- Filtro de menu por permisos: `src/components/layout/Sidebar.tsx:302`.

Riesgos:

- `AuthContext` concentra demasiadas responsabilidades.
- Se usa `user_metadata` para nombres/avatar en UI. Esta bien para presentacion, pero no debe alimentar autorizacion.
- La seleccion de empresa depende de `localStorage`, lo cual esta bien para UX pero no debe ser usado como garantia de acceso.

Acciones recomendadas:

- Separar `AuthContext` en sesion, empresa activa y permisos.
- Mantener autorizacion critica siempre en RLS/RPC/Edge Function.
- Agregar tests de permisos por modulo para rutas y acciones.

### Empleados y empleado 360

Es uno de los nucleos del producto. Tiene buena cobertura funcional: perfil, contacto, familia, seguridad social, banco, jornada, documentos, salud y 360.

Riesgos:

- `useEmployees.ts` hace creacion/actualizacion multi-tabla desde cliente.
- `EmployeeFormDialog.tsx` es el componente mas grande del proyecto.
- Transferencia y reingreso tocan empleados, asignaciones, historiales y auditoria.

Acciones recomendadas:

- Crear RPC `create_employee_full` y `update_employee_full` para operaciones atomicas.
- Dividir `EmployeeFormDialog` en secciones: identidad, laboral, seguridad social, familia, banco, jornada y anexos.
- Agregar pruebas de creacion/edicion con datos minimos y datos completos.

### Seleccion, requisiciones y vacantes

Modulo rico: requisiciones, vacantes, candidatos, etapas, seleccion, diversidad y conversion a empleado.

Riesgos:

- `useCandidates.ts` convierte candidatos a empleados/contratos con 18 tablas y 22 escrituras.
- `CandidateFormDialog` y `VacancyDetailDialog` superan 1.200 lineas.
- La conversion candidato -> empleado deberia ser transaccional.

Acciones recomendadas:

- Mover contratacion/conversion a una RPC o Edge Function con idempotencia.
- Separar candidato, documentos, familia, etapas y contratacion en unidades menores.
- Verificar RLS de `candidate_documents`, `candidate_family_members` y flujos publicos de registro.

### Contratos y retiros

Contratos tiene auditoria, numeracion, prorrogas, terminacion y documentos.

Riesgos:

- Terminacion actualiza contrato, empleado, work info, documentos y auditoria desde cliente.
- Generacion documental mezcla reglas laborales con UI en algunos componentes/lib.
- Preaviso depende de Edge Function programada con service role.

Acciones recomendadas:

- Centralizar retiro en RPC/Edge Function `complete_termination`.
- Mantener generadores de documentos como librerias puras y probar placeholders.
- Proteger cron de preaviso con secreto.

### Nomina, jornadas, novedades, PILA/UGPP, prestamos y descuentos

La capa de nomina esta extendida y toca muchas entidades: jornadas, turnos, horas extra, novedades, pre-liquidacion, prestamos, descuentos, cesantias y UGPP.

Riesgos:

- `useSchedules.ts` contiene mucha logica de ciclos, turnos y asignaciones.
- `AnaliticaNomina.tsx` es la pagina mas grande del proyecto.
- Operaciones de calendario laboral requieren consistencia temporal fuerte.

Acciones recomendadas:

- Extraer motor de jornadas/ciclos a funciones puras testeables.
- Crear pruebas para solapamientos, ausencias, vacaciones e incapacidades.
- Mover cierres o calculos de periodo a RPC/Edge Function.

### Tiempo: vacaciones, permisos e incapacidades

El modulo esta bien separado en hooks (`useVacations`, `useLeaves`, `useIncapacities`) y componentes por dialogo/panel.

Riesgos:

- Vacaciones actualiza solicitudes y balances; debe evitar dobles aprobaciones.
- Incapacidades puede disparar examenes de reintegro y estados de recuperacion.
- Hay funciones programadas de alertas con service role.

Acciones recomendadas:

- Usar RPC para aprobar/rechazar vacaciones y permisos con control de concurrencia.
- Proteger jobs de alertas.
- Agregar tests de saldos y dias habiles.

### Dotacion y examenes medicos

Estos modulos comparten patrones: catalogos, profesiogramas, inventario/transacciones, entregas y documentos/firma.

Riesgos:

- Dotacion ajusta inventario y crea movimientos desde cliente.
- Hay mucho `as any` alrededor de profesiogramas y transacciones.
- Algunas cargas usan `getPublicUrl`; confirmar si los buckets contienen informacion sensible.

Acciones recomendadas:

- Mover entrega/devolucion/ajuste de inventario a RPC transaccional.
- Generar tipos Supabase actualizados para reducir `as any`.
- Auditar buckets `dotation-images` y `documents`: publicos solo si corresponde.

### Capacitaciones e IA de formacion

Modulo muy potente: cursos, sesiones, tokens publicos, evidencia, certificado, contenido IA, audio/video/avatar.

Riesgos:

- `useTraining.ts` es grande y escribe en 9 tablas.
- `CrearCapacitacion.tsx` y `TrainingPreviewDialog.tsx` concentran mucha UI + generacion IA.
- Varias funciones de IA usan service role y proveedores externos.
- `ai-text-to-speech` no valida usuario.

Acciones recomendadas:

- Separar CRUD de capacitaciones, evidencia, certificados y media.
- Unificar validacion de permisos para funciones IA.
- Limitar costo/abuso por empresa y usuario en generaciones IA.

### Evaluaciones de desempeno

Modulo estructurado por plantillas, criterios, ciclos, evaluaciones, scores y objetivos.

Riesgos:

- `useEvaluations.ts` tiene 19 escrituras y varios casts.
- Cambios en plantillas borran/reinsertan criterios y posiciones.

Acciones recomendadas:

- Crear operaciones atomicas para versionar plantillas.
- Evitar eliminar criterios historicos si existen evaluaciones asociadas.
- Agregar tests de compatibilidad plantilla -> evaluacion.

### Disciplinarios

Tiene proceso, evidencias, defensas, decisiones, apelaciones y token publico de descargos.

Riesgos:

- Borrado de proceso elimina varias tablas desde cliente.
- Flujos publicos por token requieren hardening constante.

Acciones recomendadas:

- Mover eliminacion/cierre de proceso a RPC.
- Revisar expiracion, unicidad y scopes de tokens publicos.
- Asegurar signed URLs para evidencias sensibles.

### Notificaciones, chat y automatizaciones

Hay dos capas: notificaciones existentes y motor empresarial nuevo. Tambien hay chat interno con push.

Riesgos:

- `NotificationEngineManager.tsx` tiene 1672 lineas.
- `useNotificationEngine.ts` gestiona eventos, reglas, plantillas, proveedores, escalamiento y logs.
- Webhook Twilio no valida firma.
- Chat usa RPCs y RLS complejas; cualquier ajuste requiere pruebas de permisos cruzados.

Acciones recomendadas:

- Separar motor de notificaciones por tabs/componentes y hooks especializados.
- Validar firma Twilio.
- Agregar pruebas de RLS para chat: participante, empresa, mensajes, adjuntos, lectura.

### Reportes, analitica y asistente de datos

El area de analitica es amplia y poderosa. `ai-data-assistant` ya tiene buenas defensas: limite de longitud, lista de tablas permitidas, bloqueo de SQL peligroso, validacion de empresa y permiso.

Riesgos:

- `ai-data-assistant` tiene 1543 lineas: dificil de auditar y evolucionar.
- `useReports.ts` consulta 18 tablas.
- Las paginas de analitica son muy grandes y mezclan carga, calculo y visualizacion.

Acciones recomendadas:

- Dividir asistente IA en validacion SQL, generacion, ejecucion, persistencia y rendering.
- Extraer metricas de reportes a funciones puras.
- Agregar pruebas de consultas prohibidas y consultas permitidas.

### Catalogos, configuracion y administracion

El sistema tiene catalogos granulares y permisos dedicados (`catalogos_*`). Es una buena base para operar multiempresa.

Riesgos:

- Configuracion toca muchas tablas y buckets.
- SuperAdmin puede crear/editar companias; proteger UI no basta, debe estar reforzado por RLS/RPC.

Acciones recomendadas:

- Consolidar CRUD repetido de catalogos en un patron comun.
- Revisar que todas las tablas de catalogo tengan `company_id`, RLS y permisos.
- Evitar que configuracion de IA exponga claves al cliente.

### Portal empleado y flujos publicos

Existen portal, registro publico, capacitacion publica, descargos publicos y verificacion de certificado.

Riesgos:

- Los flujos publicos por token son superficie sensible.
- `RegistroPublico.tsx` es grande y probablemente mezcla validacion, UI y envio.
- Signed URLs deben ser preferidas para documentos privados.

Acciones recomendadas:

- Revisar expiracion y reutilizacion de tokens.
- Mover submits publicos a RPCs con validacion defensiva.
- Agregar rate limit o controles anti-abuso en endpoints publicos.

## Riesgos transversales

### Tipado

Hay uso amplio de `as any` y `as never`, especialmente en modulos que parecen haber crecido mas rapido que los tipos generados. Esto reduce proteccion de TypeScript justo donde mas se necesita.

Prioridad:

- Regenerar tipos Supabase.
- Eliminar casts en modulos criticos: candidatos, empleados, dotacion, examenes, notificaciones, capacitaciones.

### Multiempresa

La prueba estatica `src/test/hooks-company-filter.test.ts` es una excelente decision: busca que hooks con tablas company-scoped usen `currentCompanyId`. Aun asi, no reemplaza pruebas reales de RLS ni validacion server-side.

Prioridad:

- Ejecutar pruebas cuando dependencias esten instaladas.
- Agregar pruebas de permisos con usuarios de dos empresas.
- Validar RPCs y Edge Functions con `companyId` ajeno.

### Almacenamiento

Hay mezcla de `getPublicUrl` y `createSignedUrl`. Para documentos laborales, medicos, disciplinarios o personales, el default deberia ser signed URL.

Prioridad:

- Inventariar buckets y politica publica/privada.
- Cambiar documentos sensibles a signed URLs.
- Dejar publicos solo assets no sensibles: logos, imagenes de capacitacion publicas o iconografia.

### Observabilidad

Hay auditoria en varios hooks, pero no parece uniforme para todas las operaciones criticas. Edge Functions registran logs, pero muchos logs son `console.log`/`console.error` sin estructura comun.

Prioridad:

- Estandarizar `audit_logs` por modulo/accion/entidad.
- Estandarizar errores de Edge Functions.
- Agregar correlacion por `requestId` en flujos complejos.

## Backlog recomendado

### Semana 1

- Instalar dependencias y ejecutar `npm.cmd run build`, `npm.cmd run lint`, `npm.cmd run test`.
- Proteger `ai-text-to-speech` con Auth y permiso.
- Validar firma de `twilio-whatsapp-status`.
- Definir fuente canonica entre `supabase/` y `supabase_backend_package/`.

### Semana 2

- Extraer operaciones atomicas: crear empleado completo, contratar candidato, aprobar vacaciones, entregar dotacion.
- Regenerar tipos Supabase y reducir casts en hooks criticos.
- Revisar buckets y reemplazar URLs publicas sensibles por signed URLs.

### Semana 3

- Dividir `EmployeeFormDialog`, `NotificationEngineManager` y analiticas grandes.
- Agregar pruebas de RLS/multiempresa para empleados, candidatos, documentos, chat y notificaciones.
- Separar `ai-data-assistant` en modulos internos.

## Verificacion pendiente

No fue posible correr build/lint/tests porque faltan dependencias locales. Los comandos fallaron porque `vite`, `eslint` y `vitest` no estan instalados en `node_modules`. El analisis anterior es estatico y debe complementarse con validacion automatica despues de instalar dependencias.
