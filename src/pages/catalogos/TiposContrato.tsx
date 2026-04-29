import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, FileText, Download, Eye, Loader2 } from 'lucide-react';
import { useContractTypes, type ContractTypeConfig } from '@/hooks/useContractTypes';
import { ContractTypeFormDialog } from '@/components/config/ContractTypeFormDialog';
import { ContractPlaceholdersInfo } from '@/components/contracts/ContractPlaceholdersInfo';
import { MobileCardList } from '@/components/shared/MobileCardList';
import { supabase } from '@/integrations/supabase/client';
import { renderAsync } from 'docx-preview';

const codeColors = [
  'bg-primary/10 text-primary border-primary/20',
  'bg-info/10 text-info border-info/20',
  'bg-warning/10 text-warning-foreground border-warning/20',
  'bg-accent/10 text-accent border-accent/20',
  'bg-destructive/10 text-destructive border-destructive/20',
  'bg-secondary text-secondary-foreground border-secondary',
];

const getCodeColor = (code: string): string => {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  return codeColors[Math.abs(hash) % codeColors.length];
};

type PreviewTab = Pick<ContractTypeConfig, 'id' | 'display_name' | 'template_url' | 'template_file_name'>;

export default function TiposContrato() {
  const { data, isLoading, create, update, delete: deleteItem, uploadTemplate, downloadTemplate, isCreating, isUpdating } = useContractTypes();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<ContractTypeConfig | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<ContractTypeConfig | null>(null);
  const [previewTabs, setPreviewTabs] = useState<PreviewTab[]>([]);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [docxRendering, setDocxRendering] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDocxBlob, setPreviewDocxBlob] = useState<Blob | null>(null);
  const [previewDocxKey, setPreviewDocxKey] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<'pdf' | 'docx' | 'unsupported' | null>(null);
  const docxPreviewRef = useRef<HTMLDivElement>(null);
  const docxRenderIdRef = useRef(0);
  const docxHtmlCacheRef = useRef(new Map<string, string>());

  const filteredData = data.filter(item =>
    item.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.contract_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (formData: Partial<ContractTypeConfig>, file?: File) => {
    try {
      let recordId: string;
      let templateUrl: string | null = null;
      let templateFileName: string | null = null;

      if (editItem) {
        recordId = editItem.id;
        templateUrl = editItem.template_url;
        templateFileName = editItem.template_file_name;
      } else {
        // Create the record first
        const newRecord = await create({
          ...formData,
          template_url: null,
          template_file_name: null,
        });
        if (!newRecord) throw new Error('Failed to create record');
        recordId = newRecord.id;
      }

      // Upload template if file provided
      if (file) {
        const uploadedPath = await uploadTemplate(file, recordId);
        if (uploadedPath) {
          templateUrl = uploadedPath;
          templateFileName = file.name;
        }
      }

      // Update with template info (for both create and edit)
      if (editItem || file) {
        await update({
          ...formData,
          id: recordId,
          template_url: templateUrl,
          template_file_name: templateFileName,
        });
      }

      setEditItem(null);
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const handleEdit = (item: ContractTypeConfig) => {
    setEditItem(item);
    setIsFormOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteItem(deleteId);
      setDeleteId(null);
    }
  };

  const handleNewClick = () => {
    setEditItem(null);
    setIsFormOpen(true);
  };

  useEffect(() => {
    const container = docxPreviewRef.current;
    if (previewKind !== 'docx' || !previewDocxBlob || !container) return;

    const renderId = ++docxRenderIdRef.current;
    if (previewDocxKey) {
      const cachedHtml = docxHtmlCacheRef.current.get(previewDocxKey);
      if (cachedHtml) {
        container.innerHTML = cachedHtml;
        setDocxRendering(false);
        return;
      }
    }

    let cancelled = false;
    const nextContainer = document.createElement('div');
    setDocxRendering(true);

    renderAsync(previewDocxBlob, nextContainer, undefined, {
      className: 'docx-preview-content',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
    })
      .then(() => {
        if (cancelled || renderId !== docxRenderIdRef.current) return;
        container.replaceChildren(...Array.from(nextContainer.childNodes));
        if (previewDocxKey) docxHtmlCacheRef.current.set(previewDocxKey, container.innerHTML);
        setDocxRendering(false);
      })
      .catch((error) => {
        console.error('DOCX render error:', error);
        if (!cancelled && renderId === docxRenderIdRef.current) {
          setPreviewError('No se pudo renderizar visualmente la plantilla DOCX.');
          setDocxRendering(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [previewKind, previewDocxBlob, previewDocxKey]);


  const loadPreview = async (item: PreviewTab) => {
    if (!item.template_url || !item.template_file_name) return;
    setActivePreviewId(item.id);
    setPreviewItem(item as ContractTypeConfig);
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const { data: blob, error } = await supabase.storage.from('documents').download(item.template_url);
      if (error) throw error;
      const extension = item.template_file_name.split('.').pop()?.toLowerCase();
      if (extension === 'pdf') {
        setPreviewKind('pdf');
        setPreviewDocxKey(null);
        setPreviewUrl((currentUrl) => {
          if (currentUrl) URL.revokeObjectURL(currentUrl);
          return URL.createObjectURL(blob);
        });
        setPreviewDocxBlob(null);
      } else if (extension === 'docx') {
        setPreviewKind('docx');
        setPreviewDocxKey(item.template_url);
        setDocxRendering(!docxHtmlCacheRef.current.has(item.template_url));
        setPreviewDocxBlob(blob);
        setPreviewUrl((currentUrl) => {
          if (currentUrl) URL.revokeObjectURL(currentUrl);
          return null;
        });
      } else {
        setPreviewKind('unsupported');
        setPreviewError('La vista previa está disponible para PDF y DOCX. Puedes descargar este archivo para revisarlo.');
        setPreviewDocxBlob(null);
        setPreviewDocxKey(null);
      }
    } catch (error) {
      console.error('Preview error:', error);
      setPreviewError('No se pudo cargar la vista previa de la plantilla.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePreview = (item: ContractTypeConfig) => {
    setPreviewTabs((current) => {
      const exists = current.some((tab) => tab.id === item.id);
      return exists ? current : [...current, item];
    });
    void loadPreview(item);
  };

  const closePreview = () => {
    setPreviewItem(null);
    setPreviewTabs([]);
    setActivePreviewId(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewDocxBlob(null);
    setPreviewDocxKey(null);
    setDocxRendering(false);
  };

  const switchPreviewTab = (tabId: string) => {
    const tab = previewTabs.find((item) => item.id === tabId);
    if (tab) void loadPreview(tab);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Tipos de Contrato</h1>
          <p className="text-muted-foreground">
            Configure los tipos de contrato disponibles y sus plantillas
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <ContractPlaceholdersInfo />
          <Button onClick={handleNewClick} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Tipo
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle>Catálogo de Tipos de Contrato</CardTitle>
              <CardDescription>
                {filteredData.length} tipo(s) configurado(s)
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron tipos de contrato
            </div>
          ) : (
            <>
            <MobileCardList
              className="md:hidden"
              emptyMessage="No se encontraron tipos de contrato"
              items={filteredData.map((item) => ({
                id: item.id,
                title: item.display_name,
                subtitle: item.description || 'Sin descripción',
                badge: <Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Activo' : 'Inactivo'}</Badge>,
                fields: [
                  { label: 'Código', value: <code className={`text-xs px-2 py-1 rounded-md border font-medium ${getCodeColor(item.contract_type)}`}>{item.contract_type}</code>, className: 'col-span-2' },
                  { label: 'Plantilla', value: item.template_file_name || 'Sin plantilla', className: 'col-span-2' },
                ],
                actions: (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <MoreHorizontal className="w-4 h-4 mr-2" />
                        Acciones
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background border shadow-lg">
                      <DropdownMenuItem onClick={() => handleEdit(item)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {item.template_url && (
                        <DropdownMenuItem onClick={() => handlePreview(item)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Vista previa
                        </DropdownMenuItem>
                      )}
                      {item.template_url && (
                        <DropdownMenuItem onClick={() => downloadTemplate(item.template_url!, item.template_file_name!)}>
                          <Download className="w-4 h-4 mr-2" />
                          Descargar Plantilla
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setDeleteId(item.id)} className="text-destructive focus:text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ),
              }))}
            />
            <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Plantilla</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.display_name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className={`text-xs px-2 py-1 rounded-md border font-medium ${getCodeColor(item.contract_type)}`}>
                        {item.contract_type}
                      </code>
                    </TableCell>
                    <TableCell>
                      {item.template_file_name ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto py-1 px-2 text-xs"
                          onClick={() => item.template_url && handlePreview(item)}
                        >
                          <FileText className="w-3 h-3 mr-1 text-primary" />
                          <span className="text-primary truncate max-w-[100px]">
                            {item.template_file_name}
                          </span>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sin plantilla</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? 'default' : 'secondary'}>
                        {item.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background border shadow-lg">
                          <DropdownMenuItem onClick={() => handleEdit(item)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {item.template_url && (
                            <DropdownMenuItem onClick={() => handlePreview(item)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Vista previa
                            </DropdownMenuItem>
                          )}
                          {item.template_url && (
                            <DropdownMenuItem 
                              onClick={() => downloadTemplate(item.template_url!, item.template_file_name!)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Descargar Plantilla
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setDeleteId(item.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <ContractTypeFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSubmit}
        onDownloadTemplate={downloadTemplate}
        isLoading={isCreating || isUpdating}
        editItem={editItem}
      />

      <Dialog open={!!previewItem} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-4xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-6">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Vista previa de plantilla
            </DialogTitle>
            {previewItem && <p className="break-words text-sm text-muted-foreground">{previewItem.template_file_name}</p>}
            {previewTabs.length > 1 && activePreviewId && (
              <Tabs value={activePreviewId} onValueChange={switchPreviewTab} className="pt-2">
                <div className="overflow-x-auto pb-1">
                  <TabsList className="h-auto min-w-max justify-start gap-1">
                    {previewTabs.map((tab) => (
                      <TabsTrigger key={tab.id} value={tab.id} className="max-w-[220px] gap-2 pr-1">
                        <span className="truncate">{tab.display_name}</span>
                        <span
                          role="button"
                          tabIndex={0}
                          className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            removePreviewTab(tab.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              event.stopPropagation();
                              removePreviewTab(tab.id);
                            }
                          }}
                          aria-label={`Cerrar ${tab.display_name}`}
                        >
                          <X className="h-3 w-3" />
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </Tabs>
            )}
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {previewKind === 'docx' ? (
              <div className="relative min-h-[320px] overflow-x-auto rounded-lg border border-border bg-muted/30 p-3 sm:p-4">
                {(previewLoading || docxRendering) && (
                  <div className="absolute inset-x-3 top-3 z-10 flex items-center justify-center rounded-md border border-border bg-background/90 px-3 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur sm:inset-x-4 sm:top-4">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando vista previa...
                  </div>
                )}
                <div ref={docxPreviewRef} className="docx-visual-preview min-w-fit origin-top-left" />
              </div>
            ) : previewLoading ? (
              <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Cargando vista previa...
              </div>
            ) : previewError ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">{previewError}</div>
            ) : previewKind === 'pdf' && previewUrl ? (
              <iframe title="Vista previa de plantilla" src={previewUrl} className="h-[65dvh] w-full rounded-lg border border-border bg-background" />
            ) : null}
          </div>

          <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-border px-4 py-4 sm:flex-row sm:gap-0 sm:px-6">
            <Button variant="outline" onClick={closePreview} className="w-full sm:w-auto">Cerrar</Button>
            {previewItem?.template_url && (
              <Button onClick={() => downloadTemplate(previewItem.template_url!, previewItem.template_file_name || 'plantilla.docx')} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Descargar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden">
          <AlertDialogHeader className="shrink-0">
            <AlertDialogTitle>¿Eliminar tipo de contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El tipo de contrato será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="shrink-0 flex-col-reverse gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
