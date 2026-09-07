import { useIPSCatalog } from '@/hooks/useSocialSecurityCatalogs';
import { SocialSecurityCatalogPage } from './SocialSecurityCatalogPage';
import { CATALOG_PERMISSION_CODES } from '@/lib/catalogPermissions';

export default function IPS() {
  const { data, isLoading, create, update, delete: deleteItem, isCreating, isUpdating, isDeleting } = useIPSCatalog();

  return (
    <SocialSecurityCatalogPage
      permissionModule={CATALOG_PERMISSION_CODES.ips}
      title="IPS"
      description="Instituciones Prestadoras de Servicios de Salud"
      data={data}
      isLoading={isLoading}
      onCreate={create}
      onUpdate={update}
      onDelete={deleteItem}
      isCreating={isCreating}
      isUpdating={isUpdating}
      isDeleting={isDeleting}
      showIPSFields
    />
  );
}
