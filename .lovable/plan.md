Plan ajustado: el asistente usará la IA seleccionada en Configuración.

1. Crear módulo “Asistente IA”
- Agregar una ruta nueva `/asistente-ia`.
- Agregar acceso en el menú lateral.
- Crear permiso nuevo `asistente_ia` para controlarlo desde Seguridad/Roles.

2. Crear historial de conversaciones
- Crear tablas para:
  - Conversaciones de chat.
  - Mensajes del usuario y de la IA.
- Guardar empresa, usuario, modo del chat y fechas.
- Aplicar seguridad por empresa y usuario.

3. Crear el chat de ayuda de uso de la app
- Modo inicial activo: “Ayuda sobre la app”.
- Responder solo preguntas de uso: módulos, procesos, dónde hacer acciones, flujo recomendado.
- Rechazar temas externos a la app.
- Renderizar respuestas con Markdown.

4. Dejar preparada la base para el segundo chat de análisis de datos
- Incluir el modo `data_analysis`, pero dejarlo bloqueado/“próximamente” en la interfaz.
- La estructura quedará lista para luego permitir preguntas como conteos, análisis y reportes, sin mezclarlo con el chat de ayuda.

5. Usar la IA seleccionada en Configuración
- La función backend leerá `system_config.ai_config` de la empresa actual.
- Si en Configuración está seleccionado Gemini y hay API Key guardada, usará Gemini.
- Si está seleccionado OpenAI y hay API Key guardada, usará OpenAI.
- Si no hay API Key válida, usará Lovable AI como respaldo automático.
- Mantendrá el prompt de control en backend, no en el navegador.

6. Seguridad y permisos
- El cliente nunca verá las API Keys.
- La función validará el usuario autenticado y la empresa actual.
- El chat de ayuda no consultará datos sensibles de empleados, contratos o nómina.
- El futuro chat de análisis se implementará después con validaciones por módulo y empresa.

Detalles técnicos
- Nueva función backend `ai-chat`.
- Nuevas tablas: `ai_chat_conversations` y `ai_chat_messages`.
- Nuevo hook frontend para enviar mensajes y cargar historial.
- Nueva página `AsistenteIA.tsx` con selector de modo, lista de conversaciones y chat.
- Reutilizará el patrón existente de `ai_config` ya usado en capacitaciones.