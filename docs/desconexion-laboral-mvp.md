# Desconexion laboral - MVP operativo

## Alcance

Este MVP registra y monitorea la politica interna de desconexion laboral por empresa, con referencia a la Ley 2191 de 2022. No bloquea mensajes, correos, WhatsApp, aprobaciones ni tareas fuera de horario.

## Configuracion

La politica se administra en `Configuracion Laboral > Desconexion Laboral`.

Campos principales:

- Politica activa.
- Nombre de politica y referencia legal.
- Horario protegido de inicio y fin.
- Aplicacion en fines de semana y festivos.
- Responsable interno.
- Ultima revision y proxima revision.
- Notas de excepciones documentadas.

## Evidencia

La evidencia se gestiona en `Cumplimiento Laboral` usando la plantilla `Politica de desconexion laboral`.

Evidencia recomendada:

- Politica interna aprobada.
- Soporte de socializacion.
- Acta, circular, comunicado o documento firmado.

## Alertas

El radar de alertas muestra una alerta de desconexion laboral cuando la politica esta activa y:

- La proxima revision esta vencida.
- La proxima revision ocurre dentro de los siguientes 15 dias.
- No existe obligacion/evidencia asociada en cumplimiento laboral.

## Fuera del MVP

- Bloqueo de comunicaciones fuera de jornada.
- Validacion por empleado, cargo o turno individual.
- Reglas automáticas por cargos de direccion, confianza o manejo.
- Justificacion obligatoria de urgencia, fuerza mayor o disponibilidad permanente.
- Analitica de incumplimientos por canal o usuario.
