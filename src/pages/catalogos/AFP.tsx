import { useAFPCatalog } from '@/hooks/useSocialSecurityCatalogs';
import { SocialSecurityCatalogPage } from './SocialSecurityCatalogPage';
import { CATALOG_PERMISSION_CODES } from '@/lib/catalogPermissions';

export default function AFP() {
  const { data, isLoading, create, update, delete: deleteItem, isCreating, isUpdating, isDeleting } = useAFPCatalog();

  return (
    <SocialSecurityCatalogPage
      permissionModule={CATALOG_PERMISSION_CODES.afp}
      title="AFP"
      description="Administradoras de Fondos de Pensiones"
      data={data}
      isLoading={isLoading}
      onCreate={create}
      onUpdate={update}
      onDelete={deleteItem}
      isCreating={isCreating}
      isUpdating={isUpdating}
      isDeleting={isDeleting}
    />
  );
}
