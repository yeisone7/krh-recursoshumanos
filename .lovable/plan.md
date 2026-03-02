

## Profesiograma de Dotacion y Entrega Inteligente

### Objetivo
Crear un sistema de "Profesiograma de Dotacion" que asocie tipos de dotacion a combinaciones de Centro de Operacion + Cargo. Al registrar una entrega, al seleccionar un empleado se cargara automaticamente la lista de articulos sugeridos segun su profesiograma, permitiendo confirmar o modificar antes de guardar.

---

### 1. Catalogo de Tipos de Dotacion (ya existe)

El catalogo de tipos de dotacion ya esta implementado en:
- Tabla: `dotation_item_types`
- Pagina: `/catalogos/tipos-dotacion` (`src/pages/catalogos/TiposDotacion.tsx`)
- CRUD: `useSystemConfig.ts` (hooks de dotation item types)
- Formulario: `DotationItemTypeFormDialog.tsx`

No se requieren cambios en este catalogo.

---

### 2. Nueva tabla: `dotation_profesiograma`

Tabla puente que asocia Centro de Operacion + Cargo con tipos de dotacion.

```text
dotation_profesiograma
+---------------------+--------------------------------------+
| id                  | UUID PK                              |
| company_id          | UUID FK -> companies                 |
| operation_center_id | UUID FK -> operation_centers          |
| position_id         | UUID FK -> positions                 |
| created_by          | UUID nullable                        |
| created_at          | TIMESTAMPTZ                          |
| updated_at          | TIMESTAMPTZ                          |
+---------------------+--------------------------------------+
UNIQUE(company_id, operation_center_id, position_id)
```

### 3. Nueva tabla: `dotation_profesiograma_items`

Articulos asociados a cada profesiograma.

```text
dotation_profesiograma_items
+---------------------+--------------------------------------+
| id                  | UUID PK                              |
| profesiograma_id    | UUID FK -> dotation_profesiograma    |
| dotation_item_type_id | UUID FK -> dotation_item_types     |
| quantity            | INTEGER default 1                    |
| notes               | TEXT nullable                        |
| created_at          | TIMESTAMPTZ                          |
+---------------------+--------------------------------------+
UNIQUE(profesiograma_id, dotation_item_type_id)
```

RLS: Lectura y escritura para miembros de la empresa con rol admin/rrhh.

---

### 4. Nueva pagina: Profesiograma de Dotacion

**Ruta:** Nueva pestana "Profesiograma" dentro de la pagina de Dotacion (`/dotacion`) o como seccion independiente.

Se agregara como tercera pestana en `src/pages/Dotacion.tsx`:
- Entregas (existente)
- Inventario (existente)  
- **Profesiograma** (nueva)

**Contenido de la pestana:**
- Tabla con columnas: Centro de Operacion, Cargo, Cantidad de Articulos, Acciones (editar/eliminar)
- Boton "Nuevo Profesiograma"
- Al hacer clic en editar, abre un dialogo donde se selecciona centro + cargo y se agregan/quitan tipos de dotacion del catalogo

---

### 5. Nuevos componentes

- **`src/components/dotation/ProfesiogramaTab.tsx`**: Pestana con tabla de profesiogramas
- **`src/components/dotation/ProfesiogramaFormDialog.tsx`**: Formulario para crear/editar un profesiograma (seleccionar centro + cargo, asignar articulos de dotacion del catalogo)

---

### 6. Nuevo hook: `useDotationProfesiograma`

**Archivo:** `src/hooks/useDotationProfesiograma.ts`

Funciones:
- `useProfesiogramas()`: Lista todos los profesiogramas con sus items, centros y cargos
- `useProfesiogramaByEmployee(employeeId)`: Busca el profesiograma que coincide con el centro + cargo del empleado
- `useCreateProfesiograma()`: Crea profesiograma + items
- `useUpdateProfesiograma()`: Actualiza items
- `useDeleteProfesiograma()`: Elimina

---

### 7. Modificar formulario de entrega (`DotationFormDialog.tsx`)

Cambio principal: al seleccionar un empleado, el sistema:
1. Obtiene su `operation_center_id` y `position_id` desde `employee_work_info`
2. Consulta `dotation_profesiograma` + `dotation_profesiograma_items` para esa combinacion
3. Si existe un profesiograma, muestra la lista de articulos sugeridos con checkboxes para confirmar o quitar
4. El usuario puede modificar cantidades o agregar articulos adicionales
5. Al confirmar, se crean las entregas para cada articulo seleccionado

La pestana "Articulo" del formulario actual se reemplaza por una vista de lista de articulos sugeridos con capacidad de edicion.

---

### Secuencia de implementacion

1. Crear migracion con las dos tablas nuevas y politicas RLS
2. Crear hook `useDotationProfesiograma`
3. Crear componentes de profesiograma (tab + formulario)
4. Integrar pestana en la pagina de Dotacion
5. Modificar `DotationFormDialog` para cargar sugerencias automaticas al seleccionar empleado

