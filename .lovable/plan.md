Propuesta: mejorar la experiencia del Asistente IA en móvil para que el usuario pueda seguir instrucciones sin estar entrando y saliendo de la vista completa del chat.

## Cambio principal

Convertir el FAB del chat en una experiencia tipo panel flotante/overlay en pantallas móviles:

```text
Usuario está en Contratos / Empleados / Alertas
        ↓
Toca FAB Asistente IA
        ↓
Se abre un panel de chat sobre la pantalla actual
        ↓
El usuario lee el paso, minimiza/cierra el panel, ejecuta la acción en el módulo
        ↓
Vuelve a abrir el FAB y continúa la misma conversación
```

## Qué se implementará

1. Mantener al usuario en el módulo actual
   - En móvil, el FAB ya no navegará necesariamente a `/asistente-ia` para usar el chat.
   - Abrirá un panel flotante encima de la pantalla actual.
   - El módulo visible seguirá siendo el contexto de trabajo del usuario.

2. Crear un chat compacto para móvil
   - Panel inferior tipo “sheet” o drawer con altura útil, por ejemplo 75-85% de la pantalla.
   - Header siempre visible dentro del panel.
   - Mensajes con scroll interno.
   - Campo de texto y botón enviar siempre accesibles.
   - Botón para minimizar/cerrar sin perder la conversación.

3. Reutilizar la lógica actual del chat
   - Mantener `useAiChat`, conversaciones, mensajes, envío, eliminación y confirmación de pasos.
   - Evitar duplicar la lógica: extraer la interfaz de chat a un componente reutilizable si es necesario.
   - La vista completa `/asistente-ia` puede seguir existiendo para escritorio o para consulta más amplia.

4. Corregir el flujo guiado por pasos
   - El botón “Paso X · continuar” quedará dentro del panel flotante.
   - Al confirmar un paso, el scroll se mantendrá al final del chat.
   - El usuario podrá cerrar/minimizar el panel para ejecutar la instrucción y reabrirlo para continuar.

5. Ajustar el FAB para evitar superposiciones
   - En móvil, el FAB se ubicará por encima del navbar verde y fuera del área del botón enviar.
   - Cuando el panel esté abierto, el FAB se ocultará o se convertirá en acción de minimizar según convenga para no tapar el input.

## Resultado esperado

El usuario no tendrá que alternar entre “pantalla de chat” y “pantalla del módulo”. Podrá usar el asistente como acompañamiento contextual mientras trabaja en Contratos, Empleados, Alertas, etc.

## Detalles técnicos

- Archivos principales a tocar:
  - `src/components/layout/AppLayout.tsx`
  - `src/pages/AsistenteIA.tsx`
  - Posible nuevo componente compartido para el panel/chat compacto.
- Se conservará el contexto `krh_last_module_path` para que el asistente sepa desde qué módulo se abrió.
- No requiere cambios de base de datos.
- No requiere cambios en la función de IA salvo que se detecte que el prompt necesita reforzar el flujo contextual.