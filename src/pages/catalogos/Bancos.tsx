import { useBanksCatalog } from '@/hooks/useBanksCatalog';
import { SocialSecurityCatalogPage } from './SocialSecurityCatalogPage';
import { CATALOG_PERMISSION_CODES } from '@/lib/catalogPermissions';

export default function Bancos() {
  const { data, isLoading, create, update, delete: deleteItem, isCreating, isUpdating, isDeleting } = useBanksCatalog();

  return (
    <SocialSecurityCatalogPage
      permissionModule={CATALOG_PERMISSION_CODES.bancos}
      title="Bancos"
      description="Catálogo de entidades bancarias para nómina"
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
