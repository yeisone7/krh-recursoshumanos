
# Plan: Usar nombre dinámico del catálogo de tipos de contrato

## Problema identificado

El grid de contratos muestra "Término Fijo" porque usa un mapeo estático en el código, en lugar de obtener el `display_name` del catálogo `contract_type_config` que tiene el valor "Contrato a término fijo inferior a un año".

## Solución propuesta

Modificar la página de Contratos para obtener los nombres de los tipos de contrato desde el catálogo de la base de datos en lugar de usar un mapeo estático.

## Cambios a realizar

### 1. Crear hook para obtener tipos de contrato

Crear un nuevo hook `useContractTypeConfig` o agregar una funcion al archivo de hooks existente para obtener el catalogo de tipos de contrato:

```typescript
export function useContractTypeConfig() {
  const { currentCompanyId } = useAuth();
  
  return useQuery({
    queryKey: ['contract_type_config', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_type_config')
        .select('*')
        .eq('company_id', currentCompanyId!)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId,
  });
}
```

### 2. Modificar pagina Contratos.tsx

- Importar el nuevo hook
- Crear una funcion que busque el `display_name` basado en el `contract_type`
- Usar el nombre dinamico en la columna "Tipo" del grid
- Actualizar el filtro de tipos para usar valores del catalogo

**Antes (estatico):**
```typescript
const contractTypeLabels = {
  fijo: 'Término Fijo',
  ...
};

// En el grid:
<span>{contractTypeLabels[contract.contract_type]}</span>
```

**Despues (dinamico):**
```typescript
const { data: contractTypes } = useContractTypeConfig();

const getContractTypeLabel = (type: string) => {
  const config = contractTypes?.find(ct => ct.contract_type === type);
  return config?.display_name || type;
};

// En el grid:
<span>{getContractTypeLabel(contract.contract_type)}</span>
```

### 3. Actualizar filtros del Select

Cambiar los items del Select de tipos de contrato para que se generen dinamicamente desde el catalogo, en lugar de estar fijos en el codigo.

## Archivos a modificar

1. `src/hooks/useContractTypes.ts` - Agregar funcion `useContractTypeConfig` (o crear nuevo archivo)
2. `src/pages/Contratos.tsx` - Usar el hook y mostrar nombres dinamicos

## Resultado esperado

En lugar de "Término Fijo", se mostrara "Contrato a término fijo inferior a un año" (o el nombre que este configurado en el catalogo para cada tipo de contrato).
