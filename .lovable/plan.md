Implementaré el chat IA como una sesión temporal, sin guardar historial en la base de datos.

Cambios propuestos:

1. Quitar historial guardado del chat
- El asistente dejará de cargar conversaciones anteriores.
- Se eliminará visualmente la sección/listado de “Conversaciones” en la vista completa.
- El botón “Nueva” sí hará algo claro: reiniciará la conversación temporal actual.

2. Mantener conversación solo mientras el panel esté abierto/minimizado
- Los mensajes vivirán en memoria del componente.
- Si el chat está minimizado, la conversación seguirá disponible.
- Si el usuario cierra el chat, esa conversación se perderá.

3. Confirmar antes de cerrar
- Al cerrar el chat, mostraré una confirmación indicando que la conversación no se guarda.
- Si confirma, se limpia la conversación y se cierra el panel.
- Si cancela, vuelve al chat sin perder nada.

4. Ajustar el backend del asistente
- La función de IA dejará de crear registros en `ai_chat_conversations` y `ai_chat_messages`.
- Recibirá el historial temporal enviado desde el frontend para mantener contexto durante la sesión.
- Responderá igual que ahora, pero sin persistencia.

5. Ajustar textos visuales
- Cambiaré mensajes como “Nueva conversación” o “Historial personal por empresa” por textos acordes a conversación temporal.
- Eliminaré acciones de borrar historial, porque ya no habrá historial persistente.

Detalles técnicos:
- Archivos principales a modificar:
  - `src/hooks/useAiChat.ts`
  - `src/components/ai/AiChatPanel.tsx`
  - `src/components/layout/AppLayout.tsx`
  - `supabase/functions/ai-chat/index.ts`
- No se eliminarán tablas existentes; simplemente se dejarán de usar para este chat.
- Mantendré la validación de empresa/usuario y el prompt visual ya configurado.