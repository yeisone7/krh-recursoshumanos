import { useARLCatalog } from '@/hooks/useSocialSecurityCatalogs';
import { SocialSecurityCatalogPage } from './SocialSecurityCatalogPage';

export default function ARL() {
  const { data, isLoading, create, update, delete: deleteItem, isCreating, isUpdating, isDeleting } = useARLCatalog();

  return (
    <SocialSecurityCatalogPage
      title="ARL"
      description="Administradoras de Riesgos Laborales"
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
