import { useCCFCatalog } from '@/hooks/useSocialSecurityCatalogs';
import { SocialSecurityCatalogPage } from './SocialSecurityCatalogPage';
import { CATALOG_PERMISSION_CODES } from '@/lib/catalogPermissions';

export default function CCF() {
  const { data, isLoading, create, update, delete: deleteItem, isCreating, isUpdating, isDeleting } = useCCFCatalog();

  return (
    <SocialSecurityCatalogPage
      permissionModule={CATALOG_PERMISSION_CODES.ccf}
      title="Caja de Compensación"
      description="Cajas de Compensación Familiar"
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
