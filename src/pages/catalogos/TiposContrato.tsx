import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Search, MoreHorizontal, Pencil, Trash2, FileText, Download, Eye, Loader2, X, Check, LayoutGrid, Clock, Calendar, CheckCircle2, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContractTypes, type ContractTypeConfig } from '@/hooks/useContractTypes';
import { ContractTypeFormDialog } from '@/components/config/ContractTypeFormDialog';
import { LegalSignatureDialog } from '@/components/config/LegalSignatureDialog';
import { ContractPlaceholdersInfo } from '@/components/contracts/ContractPlaceholdersInfo';
import { MobileCardList } from '@/components/shared/MobileCardList';
import { supabase } from '@/integrations/supabase/client';
import { renderAsync } from 'docx-preview';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

const codeColors = [
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-sky-50 text-sky-700 border-sky-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-cyan-50 text-cyan-700 border-cyan-200',
  'bg-orange-50 text-orange-700 border-orange-200',
  'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  'bg-lime-50 text-lime-700 border-lime-200',
  'bg-indigo-50 text-indigo-700 border-indigo-200',
];

type PreviewTab = Pick<ContractTypeConfig, 'id' | 'display_name' | 'template_url' | 'template_file_name'>;

export default function TiposContrato() {
  const { data = [], isLoading, create, update, delete: deleteItem, uploadTemplate, downloadTemplate, isCreating, isUpdating } = useContractTypes();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
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

  const codeColorMap = useMemo(() => {
    const codes = [...new Set(data.map(item => item.contract_type))].sort((a, b) => a.localeCompare(b));
    return new Map(codes.map((code, index) => [code, codeColors[index % codeColors.length]]));
  }, [data]);

  const getCodeColor = (code: string): string => codeColorMap.get(code) || codeColors[0];

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
    <div className="space-y-3 sm:space-y-4 max-w-7xl mx-auto px-2 sm:px-6">
      {/* Header Premium Flat */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="relative p-3 sm:p-4 rounded-[1rem] sm:rounded-[1.5rem] bg-white border border-slate-100"
      >
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2.5 sm:gap-3">
            <div className="relative shrink-0 group">
              <div className="relative h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 transition-all duration-300">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-0.5">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-black text-[8px] px-2 py-0 rounded-full uppercase tracking-widest">
                  Gestión Contractual
                </Badge>
              </div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-foreground uppercase leading-tight">
                Tipos de Contrato
              </h1>
              <p className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase tracking-widest sm:tracking-[0.16em]">
                Modelos de vinculación y plantillas legales
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
            <ContractPlaceholdersInfo className="h-9 px-3 rounded-lg font-black uppercase tracking-widest text-[10px]" />
            <Button 
              variant="outline"
              onClick={() => setIsSignatureOpen(true)} 
              className="h-9 px-3 rounded-lg font-black uppercase tracking-widest text-[10px] border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-none"
            >
              Firma Legal
            </Button>
            <Button 
              onClick={handleNewClick} 
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] transition-all"
            >
              <Plus className="w-3.5 h-3.5 mr-2 stroke-[3]" />
              NUEVO TIPO
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Summary - Flat Style */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 px-1 sm:px-0">
        {[
          { label: 'Total Tipos', value: stats.total, icon: LayoutGrid, color: 'primary' },
          { label: 'Activos', value: stats.active, icon: CheckCircle2, color: 'success' },
          { label: 'Con Plantilla', value: stats.withTemplate, icon: FileText, color: 'primary' },
          { label: 'Inactivos', value: stats.inactive, icon: X, color: 'warning' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group relative rounded-xl bg-white border border-slate-100 px-3 py-2.5 sm:px-4 sm:py-3"
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                stat.color === 'primary' ? "bg-primary/10 text-primary" :
                stat.color === 'success' ? "bg-emerald-50 text-emerald-600" :
                "bg-orange-50 text-orange-600"
              )}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-none">
                  {isLoading ? <Skeleton className="h-6 w-10" /> : stat.value}
                </h3>
                <p className="mt-0.5 truncate text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1 sm:px-0">
        <div className="relative flex-1 group max-w-2xl">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            placeholder="BUSCAR POR NOMBRE O CÓDIGO..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-10 pl-10 rounded-xl bg-white border border-slate-200 focus-visible:ring-4 ring-primary/5 transition-all font-bold text-[10px] uppercase tracking-widest"
          />
        </div>
      </div>

      <Card className="rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-100 bg-white overflow-hidden">
        <div className="p-0 min-h-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 w-full bg-slate-50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="h-20 w-20 bg-slate-50 rounded-[1.75rem] flex items-center justify-center text-slate-300">
                <FileText className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 uppercase">Sin resultados</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                  {searchTerm ? 'Prueba con otro término.' : 'Comienza creando el primer tipo de contrato.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="min-h-0">
              <MobileCardList
                className="md:hidden"
                items={filteredData.map(item => ({
                  id: item.id,
                  title: item.display_name,
                  subtitle: item.description || 'Sin descripción detallada',
                  badge: <Badge className={cn("text-[8px] font-black uppercase border-none h-5 px-2 rounded-md", item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-400")}>{item.is_active ? 'Activo' : 'Inactivo'}</Badge>,
                  fields: [
                    { label: 'CÓDIGO', value: <code className={cn("text-[9px] px-2 py-0.5 rounded border font-black uppercase", getCodeColor(item.contract_type))}>{item.contract_type}</code> },
                    { 
                      label: 'PLANTILLA', 
                      value: item.template_file_name ? (
                        <div className="flex items-center gap-1 text-primary font-bold text-[9px] truncate max-w-[120px]">
                           <FileText className="w-3 h-3" /> {item.template_file_name}
                        </div>
                      ) : <span className="text-slate-300 italic text-[9px]">Sin asignar</span>
                    }
                  ],
                  actions: (
                    <div className="flex gap-2 w-full">
                      <Button variant="outline" size="sm" className="flex-1 h-9 rounded-xl font-bold text-[9px] uppercase tracking-widest" onClick={() => handleEdit(item)}>
                        <Pencil className="w-3 h-3 mr-2" /> Editar
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="px-3 h-9 rounded-xl">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border border-slate-100 shadow-xl rounded-2xl p-2 min-w-[180px]">
                          {item.template_url && (
                            <>
                              <DropdownMenuItem onClick={() => handlePreview(item)} className="rounded-xl h-10 font-bold gap-3 uppercase text-[9px] tracking-widest">
                                <Eye className="w-4 h-4 text-primary" /> Vista previa
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => downloadTemplate(item.template_url!, item.template_file_name!)} className="rounded-xl h-10 font-bold gap-3 uppercase text-[9px] tracking-widest">
                                <Download className="w-4 h-4 text-primary" /> Descargar
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem onClick={() => setDeleteId(item.id)} className="rounded-xl h-10 font-bold gap-3 text-red-600 focus:text-red-600 focus:bg-red-50 uppercase text-[9px] tracking-widest">
                            <Trash2 className="w-4 h-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                }))}
              />

              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pl-8 py-5">Nombre del Contrato</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Código</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Plantilla</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Estado</TableHead>
                      <TableHead className="text-right font-black uppercase tracking-widest text-[10px] text-slate-400 pr-8">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item) => (
                      <TableRow key={item.id} className="group border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-primary font-black text-sm group-hover:scale-110 transition-transform">
                              {item.display_name.charAt(0)}
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{item.display_name}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[280px]" title={item.description || undefined}>
                                {item.description || 'Sin especificaciones legales'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className={cn("text-[10px] px-3 py-1 rounded-lg border font-black uppercase", getCodeColor(item.contract_type))}>
                            {item.contract_type}
                          </code>
                        </TableCell>
                        <TableCell>
                          {item.template_file_name ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 px-3 rounded-xl font-bold gap-2 text-primary hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/20"
                              onClick={() => item.template_url && handlePreview(item)}
                            >
                              <FileText className="w-4 h-4 shrink-0" />
                              <span className="truncate max-w-[140px] uppercase text-[10px] tracking-tight">
                                {item.template_file_name}
                              </span>
                            </Button>
                          ) : (
                            <span className="text-slate-300 italic text-[10px] font-bold uppercase tracking-widest pl-3">Sin asignar</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            className={cn(
                              "h-7 px-3 rounded-lg border-none font-black text-[9px] uppercase tracking-widest",
                              item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-400"
                            )}
                          >
                            {item.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex justify-end opacity-100 transition-all gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                                    onClick={() => handleEdit(item)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-slate-900 text-white border-none rounded-lg text-[10px] font-bold uppercase tracking-widest">Editar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white border border-slate-100 shadow-xl rounded-2xl p-2 min-w-[200px]">
                                {item.template_url && (
                                  <>
                                    <DropdownMenuItem onClick={() => handlePreview(item)} className="rounded-xl h-10 font-bold gap-3 uppercase text-[10px] tracking-widest">
                                      <Eye className="w-4 h-4 text-primary" /> Vista previa visual
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => downloadTemplate(item.template_url!, item.template_file_name!)}
                                      className="rounded-xl h-10 font-bold gap-3 uppercase text-[10px] tracking-widest"
                                    >
                                      <Download className="w-4 h-4 text-primary" /> Descargar Plantilla
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem
                                  onClick={() => setDeleteId(item.id)}
                                  className="rounded-xl h-10 font-bold gap-3 text-red-600 focus:text-red-600 focus:bg-red-50 uppercase text-[10px] tracking-widest"
                                >
                                  <Trash2 className="w-4 h-4" /> Eliminar Registro
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
          )}
        </div>
      </Card>

      <ContractTypeFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSubmit}
        onDownloadTemplate={downloadTemplate}
        isLoading={isCreating || isUpdating}
        editItem={editItem}
      />

      <LegalSignatureDialog 
        open={isSignatureOpen} 
        onOpenChange={setIsSignatureOpen} 
      />

      <Dialog open={!!previewItem} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="flex max-h-[95dvh] w-[calc(100vw-2rem)] max-w-5xl flex-col overflow-hidden p-0 rounded-[2.5rem] bg-white border border-slate-100">
          <DialogHeader className="shrink-0 px-8 pt-8 pb-6 border-b border-slate-50 bg-slate-50/50">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-primary/10">
                    <Eye className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                      Visor de Plantilla
                    </DialogTitle>
                    {previewItem && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{previewItem.template_file_name}</p>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={closePreview} className="rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors">
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
                            className="h-10 px-4 rounded-xl font-bold gap-2 bg-white border border-slate-100 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary transition-all uppercase text-[9px] tracking-widest"
                          >
                            <span className="truncate max-w-[120px]">{tab.display_name}</span>
                          </TabsTrigger>
                          <button
                            type="button"
                            className="absolute -top-1 -right-1 z-10 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
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

          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8 bg-slate-50/30">
            {previewKind === 'docx' ? (
              <div className="relative min-h-[500px] rounded-[1.5rem] border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
                {(previewLoading || docxRendering) && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-[1.5rem]">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Procesando documento...</p>
                    </div>
                  </div>
                )}
                <div ref={docxPreviewRef} className="docx-visual-preview max-w-full overflow-hidden" />
              </div>
            ) : previewLoading ? (
              <div className="flex min-h-[500px] flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargando archivo...</p>
              </div>
            ) : previewError ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                  <X className="w-8 h-8 text-red-600" />
                </div>
                <h4 className="text-lg font-black uppercase tracking-widest mb-2">Error de Vista Previa</h4>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest max-w-md">{previewError}</p>
              </div>
            ) : previewKind === 'pdf' && previewUrl ? (
              <div className="relative h-[65vh] rounded-[1.5rem] overflow-hidden border border-slate-200 bg-white">
                <iframe title="Vista previa de plantilla" src={previewUrl} className="h-full w-full" />
              </div>
            ) : null}
          </div>

          <DialogFooter className="shrink-0 flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-50 bg-white px-8 py-6 rounded-b-[2.5rem]">
            <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase italic">
              * Representación visual aproximada.
            </p>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button variant="outline" onClick={closePreview} className="flex-1 sm:flex-none h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] border-slate-200">
                Cerrar Visor
              </Button>
              {previewItem?.template_url && (
                <Button 
                  onClick={() => downloadTemplate(previewItem.template_url!, previewItem.template_file_name || 'plantilla.docx')} 
                  className="flex-1 sm:flex-none h-12 px-8 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  <Download className="mr-2 h-4 w-4" /> Descargar
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 bg-white p-6 sm:p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-[1.25rem] bg-red-50 text-red-600 flex items-center justify-center">
              <Trash2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">¿Eliminar Registro?</AlertDialogTitle>
              <AlertDialogDescription className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                Esta acción eliminará permanentemente la configuración del tipo de contrato. <br />
                Esta operación no se puede deshacer.
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="mt-8 flex flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="h-12 rounded-2xl border-slate-200 font-black uppercase text-[10px] tracking-widest flex-1">CANCELAR</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest shadow-none flex-1">
              ELIMINAR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
