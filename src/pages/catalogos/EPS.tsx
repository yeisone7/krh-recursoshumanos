import { useEPSCatalog } from '@/hooks/useSocialSecurityCatalogs';
import { SocialSecurityCatalogPage } from './SocialSecurityCatalogPage';
import { CATALOG_PERMISSION_CODES } from '@/lib/catalogPermissions';

export default function EPS() {
  const { data, isLoading, create, update, delete: deleteItem, isCreating, isUpdating, isDeleting } = useEPSCatalog();

  return (
    <SocialSecurityCatalogPage
      permissionModule={CATALOG_PERMISSION_CODES.eps}
      title="EPS"
      description="Entidades Promotoras de Salud"
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
