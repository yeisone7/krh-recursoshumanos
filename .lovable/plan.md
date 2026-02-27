

## Plan: Esquinas redondeadas en toda la app

### Problema actual
- `--radius` esta en `0.15rem` (esquinas casi rectas)
- Las clases `.rounded-*` tienen overrides con `!important` que fuerzan radios muy pequeños

### Cambios

**`src/index.css`**:
1. Cambiar `--radius: 0.15rem` a `--radius: 0.75rem` (tanto en `:root` como en `.dark` si aplica)
2. Eliminar el bloque completo de overrides `.rounded-sm`, `.rounded`, `.rounded-md`, `.rounded-lg`, `.rounded-xl`, `.rounded-2xl`, `.rounded-3xl` con `!important` (lineas ~175-181)

Esto restaura el comportamiento normal de Tailwind y Shadcn donde `rounded-lg = var(--radius)`, `rounded-md = calc(var(--radius) - 2px)`, etc., dando esquinas suaves y redondeadas a todos los componentes (botones, tarjetas, inputs, diálogos, badges, etc.).

