

## Control de Inventarios de Dotacion (solo cantidades)

### Resumen
Agregar un sistema de inventario para artículos de dotación que permita registrar existencias por tipo de artículo y centro de operación, con descuento automático al registrar entregas.

### Cambios en la base de datos

**Nueva tabla `dotation_inventory`:**
- `id` (uuid, PK)
- `company_id` (uuid, FK a companies)
- `operation_center_id` (uuid, FK a operation_centers, nullable)
- `item_type` (dotation_item_type enum)
- `item_name` (text) - nombre descriptivo del artículo
- `size` (text, nullable) - talla si aplica
- `quantity_available` (integer, default 0) - stock actual
- `minimum_stock` (integer, default 0) - nivel mínimo para alertas
- `created_by`, `created_at`, `updated_at`
- Constraint UNIQUE en (company_id, operation_center_id, item_type, item_name, size)

**Politicas RLS:** Lectura y escritura para usuarios de la empresa (admin/rrhh).

### Cambios en el frontend

1. **Nueva pestana "Inventario" en la pagina de Dotacion** (`src/pages/Dotacion.tsx`)
   - Agregar Tabs con dos pestanas: "Entregas" (vista actual) e "Inventario"
   - La pestana de inventario muestra una tabla con: Articulo, Tipo, Centro, Talla, Stock, Minimo, Estado (bajo stock / OK)

2. **Nuevo componente `DotationInventoryTab`** (`src/components/dotation/DotationInventoryTab.tsx`)
   - Tabla con listado de inventario agrupable por centro de operacion
   - Botones para agregar stock, editar cantidades
   - Indicadores visuales de stock bajo (cuando quantity_available <= minimum_stock)
   - Filtros por centro de operacion y tipo de articulo

3. **Nuevo dialogo `InventoryFormDialog`** (`src/components/dotation/InventoryFormDialog.tsx`)
   - Formulario para agregar/editar articulos de inventario
   - Campos: centro de operacion, tipo de articulo, nombre, talla (opcional), cantidad disponible, stock minimo

4. **Nuevo dialogo `InventoryAdjustDialog`** (`src/components/dotation/InventoryAdjustDialog.tsx`)
   - Dialogo rapido para ajustar cantidades (sumar o restar unidades)
   - Motivo del ajuste (entrada, ajuste manual, devolucion)

5. **Nuevo hook `useDotationInventory`** (`src/hooks/useDotationInventory.ts`)
   - Queries: listar inventario por empresa, obtener item individual
   - Mutations: crear, actualizar, eliminar, ajustar cantidad

6. **Descuento automatico al entregar dotacion**
   - Modificar `useCreateDotationDelivery` en `src/hooks/useDotation.ts` para descontar del inventario al registrar una entrega exitosa (busca coincidencia por item_type, item_name, size, operation_center_id y resta la cantidad)
   - Invalidar queries de inventario tras entrega

7. **KPI de inventario** en las tarjetas de estadisticas
   - Agregar una tarjeta "Stock Bajo" que muestre cuantos articulos estan por debajo del minimo

### Secuencia de implementacion
1. Crear tabla y RLS (migracion)
2. Crear hook `useDotationInventory`
3. Crear componentes de inventario (tab, formularios)
4. Integrar pestana en pagina de Dotacion
5. Conectar descuento automatico en entregas

