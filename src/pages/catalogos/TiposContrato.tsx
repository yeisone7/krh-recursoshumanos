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
import { Plus, Search, MoreHorizontal, Pencil, Trash2, FileText, Download, Eye, Loader2, X, Check, LayoutGrid, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContractTypes, type ContractTypeConfig } from '@/hooks/useContractTypes';
import { ContractTypeFormDialog } from '@/components/config/ContractTypeFormDialog';
import { ContractPlaceholdersInfo } from '@/components/contracts/ContractPlaceholdersInfo';
import { MobileCardList } from '@/components/shared/MobileCardList';
import { supabase } from '@/integrations/supabase/client';
import { renderAsync } from 'docx-preview';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

  const stats = {
    total: data.length,
    active: data.filter(i => i.is_active).length,
    withTemplate: data.filter(i => i.template_url).length,
    inactive: data.filter(i => !i.is_active).length,
  };

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
        const newRecord = await create({
          ...formData,
          template_url: null,
          template_file_name: null,
        });
        if (!newRecord) throw new Error('Failed to create record');
        recordId = newRecord.id;
      }

      if (file) {
        const uploadedPath = await uploadTemplate(file, recordId);
        if (uploadedPath) {
          templateUrl = uploadedPath;
          templateFileName = file.name;
        }
      }

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

  const removePreviewTab = (tabId: string) => {
    const nextTabs = previewTabs.filter((tab) => tab.id !== tabId);
    setPreviewTabs(nextTabs);
    if (activePreviewId === tabId) {
      const nextActive = nextTabs[nextTabs.length - 1] || null;
      if (nextActive) void loadPreview(nextActive);
      else closePreview();
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-background border border-border/50 p-6 sm:p-8 shadow-xl shadow-primary/5">
        
        
        
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-6">
            <div className="relative shrink-0 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary-foreground rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative h-20 w-20 flex items-center justify-center rounded-[1.75rem] bg-background border border-border/50 shadow-lg overflow-hidden group-hover:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <FileText className="w-10 h-10 text-primary group-hover:scale-110 transition-transform duration-500" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent uppercase sm:text-4xl">
                Tipos de Contrato
              </h1>
              <p className="text-muted-foreground font-medium mt-1 tracking-wide">
                Gestión de configuraciones y plantillas legales del sistema
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ContractPlaceholdersInfo />
            <Button 
              onClick={handleNewClick} 
              className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-md shadow-primary/10 hover:scale-105 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 mr-2 stroke-[3]" />
              Nuevo Tipo
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Total Tipos', value: stats.total, icon: LayoutGrid, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Activos', value: stats.active, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Con Plantilla', value: stats.withTemplate, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Inactivos', value: stats.inactive, icon: X, color: 'text-destructive', bg: 'bg-destructive/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative rounded-[2rem] bg-background border border-border/50 p-6 shadow-md hover:shadow-lg transition-all hover:border-primary/20"
          >
            <div className="flex items-center gap-4">
              <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110 duration-300", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-black">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Card className="rounded-[2.5rem] bg-background border border-border/50 shadow-xl overflow-hidden">
        <CardHeader className="p-8 border-b border-border/50">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Catálogo de Tipos
              </CardTitle>
              <CardDescription className="font-medium tracking-wide">
                {filteredData.length} tipo(s) de contrato configurado(s) en el sistema
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 pl-11 pr-4 rounded-2xl bg-background border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
              </div>
              <p className="text-muted-foreground font-black uppercase tracking-[0.2em] text-xs">Sincronizando catálogo...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <div className="w-20 h-20 rounded-[2rem] bg-background flex items-center justify-center mb-6 border border-border/50">
                <FileText className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-widest mb-2">No se encontraron resultados</h3>
              <p className="text-muted-foreground font-medium max-w-sm">
                No hay tipos de contrato que coincidan con tu búsqueda actual. Intenta con otros términos.
              </p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <MobileCardList
                className="md:hidden p-4 space-y-4"
                emptyMessage="No se encontraron tipos de contrato"
                items={filteredData.map((item) => ({
                  id: item.id,
                  title: <span className="font-black uppercase tracking-tight text-foreground">{item.display_name}</span>,
                  subtitle: <span className="text-xs font-medium text-muted-foreground line-clamp-1">{item.description || 'Sin descripción detallada'}</span>,
                  badge: (
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm",
                      item.is_active 
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                        : "bg-background text-muted-foreground border-border"
                    )}>
                      <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", item.is_active ? "bg-emerald-500" : "bg-background -foreground")} />
                      {item.is_active ? 'Activo' : 'Inactivo'}
                    </div>
                  ),
                  fields: [
                    { label: 'CÓDIGO', value: <code className={cn("text-[10px] px-2.5 py-1 rounded-lg border-2 font-black transition-all", getCodeColor(item.contract_type))}>{item.contract_type}</code>, className: 'col-span-2' },
                    { 
                      label: 'PLANTILLA', 
                      value: item.template_file_name ? (
                        <div className="flex items-center gap-2 text-primary font-bold">
                           <FileText className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[150px]">{item.template_file_name}</span>
                        </div>
                      ) : <span className="text-muted-foreground/50 italic">Sin asignar</span>, 
                      className: 'col-span-2' 
                    },
                  ],
                  actions: (
                    <div className="flex gap-2">
                      <Button onClick={() => handleEdit(item)} variant="outline" size="sm" className="flex-1 h-10 rounded-xl font-black uppercase tracking-widest text-[10px]">
                        <Pencil className="w-3 h-3 mr-2" />
                        Editar
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="px-3 h-10 rounded-xl">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background border border-border/50 shadow-2xl rounded-2xl p-2 min-w-[200px]">
                          {item.template_url && (
                            <>
                              <DropdownMenuItem onClick={() => handlePreview(item)} className="rounded-xl h-10 font-bold gap-3">
                                <Eye className="w-4 h-4 text-primary" />
                                Vista previa
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => downloadTemplate(item.template_url!, item.template_file_name!)} className="rounded-xl h-10 font-bold gap-3">
                                <Download className="w-4 h-4 text-primary" />
                                Descargar Plantilla
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem onClick={() => setDeleteId(item.id)} className="rounded-xl h-10 font-bold gap-3 text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                            Eliminar Registro
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ),
                }))}
              />
              <div className="hidden md:block">
                <div className="overflow-hidden border-t border-border/50">
                  <Table>
                    <TableHeader className="bg-background">
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="h-14 font-black uppercase tracking-[0.2em] text-[10px] text-muted-foreground pl-8">Tipo de Contrato</TableHead>
                        <TableHead className="h-14 font-black uppercase tracking-[0.2em] text-[10px] text-muted-foreground">Código Sistema</TableHead>
                        <TableHead className="h-14 font-black uppercase tracking-[0.2em] text-[10px] text-muted-foreground">Documento Base</TableHead>
                        <TableHead className="h-14 font-black uppercase tracking-[0.2em] text-[10px] text-muted-foreground">Estado</TableHead>
                        <TableHead className="h-14 w-[100px] pr-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((item, i) => (
                        <TableRow key={item.id} className="group hover:transition-colors border-border/50">
                          <TableCell className="pl-8 py-4">
                            <div className="flex flex-col gap-0.5">
                              <p className="font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">{item.display_name}</p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground font-medium line-clamp-1 max-w-xs italic">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <code className={cn(
                              "text-[11px] px-3 py-1 rounded-lg border-2 font-black shadow-sm transition-all group-hover:scale-105", 
                              getCodeColor(item.contract_type)
                            )}>
                              {item.contract_type}
                            </code>
                          </TableCell>
                          <TableCell className="py-4">
                            {item.template_file_name ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 px-3 rounded-xl font-bold gap-2 text-primary hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/20"
                                onClick={() => item.template_url && handlePreview(item)}
                              >
                                <FileText className="w-4 h-4 shrink-0" />
                                <span className="truncate max-w-[140px]">
                                  {item.template_file_name}
                                </span>
                              </Button>
                            ) : (
                              <div className="flex items-center gap-2 text-muted-foreground/40 font-bold px-3 italic">
                                <X className="w-3.5 h-3.5" />
                                <span className="text-[11px] uppercase tracking-widest">Sin asignar</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-4">
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm transition-all",
                              item.is_active 
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                : "bg-background text-muted-foreground border-border"
                            )}>
                              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", item.is_active ? "bg-emerald-500" : "bg-background -foreground")} />
                              {item.is_active ? 'Activo' : 'Inactivo'}
                            </div>
                          </TableCell>
                          <TableCell className="pr-8 py-4">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                                      onClick={() => handleEdit(item)}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar configuración</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-background border border-border/50 shadow-2xl rounded-2xl p-2 min-w-[200px]">
                                  {item.template_url && (
                                    <>
                                      <DropdownMenuItem onClick={() => handlePreview(item)} className="rounded-xl h-10 font-bold gap-3">
                                        <Eye className="w-4 h-4 text-primary" />
                                        Vista previa visual
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => downloadTemplate(item.template_url!, item.template_file_name!)}
                                        className="rounded-xl h-10 font-bold gap-3"
                                      >
                                        <Download className="w-4 h-4 text-primary" />
                                        Descargar Plantilla Original
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => setDeleteId(item.id)}
                                    className="rounded-xl h-10 font-bold gap-3 text-destructive focus:text-destructive focus:bg-destructive/10"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Eliminar del Catálogo
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
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
        <DialogContent className="flex max-h-[95dvh] w-[calc(100vw-2rem)] max-w-5xl flex-col overflow-hidden p-0 rounded-[2.5rem] bg-background -3xl border border-border/50 shadow-xl shadow-primary/5">
          <DialogHeader className="shrink-0 px-8 pt-8 pb-6 border-b border-border/50 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-primary/10">
                    <Eye className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-widest">
                      Visor de Plantilla
                    </DialogTitle>
                    {previewItem && <p className="text-sm font-bold text-muted-foreground/70 tracking-wide mt-0.5">{previewItem.template_file_name}</p>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={closePreview} className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              {previewTabs.length > 1 && activePreviewId && (
                <Tabs value={activePreviewId} onValueChange={switchPreviewTab} className="w-full">
                  <div className="overflow-x-auto pb-2 scrollbar-none">
                    <TabsList className="h-12 w-full justify-start gap-2 bg-transparent p-0">
                      {previewTabs.map((tab) => (
                        <div key={tab.id} className="relative group">
                          <TabsTrigger 
                            value={tab.id} 
                            className="h-10 px-4 rounded-xl font-bold gap-2 bg-background data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                          >
                            <span className="truncate max-w-[120px]">{tab.display_name}</span>
                          </TabsTrigger>
                          <button
                            type="button"
                            className="absolute -top-1 -right-1 z-10 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              removePreviewTab(tab.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </TabsList>
                  </div>
                </Tabs>
              )}
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8 bg-background scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20 transition-colors">
            {previewKind === 'docx' ? (
              <div className="relative min-h-[500px] rounded-3xl border-2 border-dashed border-border bg-background p-6 sm:p-10 shadow-inner">
                {(previewLoading || docxRendering) && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-background rounded-3xl">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Procesando documento...</p>
                    </div>
                  </div>
                )}
                <div ref={docxPreviewRef} className="docx-visual-preview max-w-full overflow-hidden" />
              </div>
            ) : previewLoading ? (
              <div className="flex min-h-[500px] flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Cargando archivo...</p>
              </div>
            ) : previewError ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                  <X className="w-8 h-8 text-destructive" />
                </div>
                <h4 className="text-lg font-black uppercase tracking-widest mb-2">Error de Vista Previa</h4>
                <p className="text-muted-foreground font-medium max-w-md">{previewError}</p>
              </div>
            ) : previewKind === 'pdf' && previewUrl ? (
              <div className="relative h-[65vh] rounded-3xl overflow-hidden border border-border shadow-2xl">
                <iframe title="Vista previa de plantilla" src={previewUrl} className="h-full w-full bg-background" />
              </div>
            ) : null}
          </div>

          <DialogFooter className="shrink-0 flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/50 bg-background px-8 py-6 rounded-b-[2.5rem]">
            <p className="text-xs font-bold text-muted-foreground tracking-wide italic">
              * La vista previa es una representación visual aproximada.
            </p>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button variant="outline" onClick={closePreview} className="flex-1 sm:flex-none h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] bg-background border-border">
                Finalizar Vista
              </Button>
              {previewItem?.template_url && (
                <Button 
                  onClick={() => downloadTemplate(previewItem.template_url!, previewItem.template_file_name || 'plantilla.docx')} 
                  className="flex-1 sm:flex-none h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar Archivo
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-[2.5rem] bg-background border border-border/50 shadow-xl p-8 max-w-md">
          <AlertDialogHeader>
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8 text-destructive" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-widest">
              ¿Eliminar tipo de contrato?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium text-muted-foreground pt-2">
              Esta acción eliminará permanentemente la configuración de **"{filteredData.find(i => i.id === deleteId)?.display_name}"**. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3 sm:gap-0">
            <AlertDialogCancel className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] border-border hover:bg-background transition-all">
              Cancelar Operación
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] bg-destructive text-white hover:bg-destructive/90 shadow-lg shadow-destructive/20 transition-all"
            >
              Confirmar Eliminación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
