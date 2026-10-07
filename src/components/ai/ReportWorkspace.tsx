import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Sparkles,
  History,
  Star,
  Pencil,
  Trash2,
  Mic,
  Loader2,
  AlertCircle,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  reportRequest,
  type ReportBootstrap,
  type ReportResult,
  type ReportFilters,
  type Favorite,
  type ReportListItem,
} from '@/lib/reporting';
import { ReportResults } from './ReportResults';

const exampleAccents: Record<string, string> = {
  employees_v2: 'border-l-sky-400 bg-sky-50/40 hover:bg-sky-50',
  contracts: 'border-l-violet-400 bg-violet-50/40 hover:bg-violet-50',
  time_clock_days: 'border-l-teal-400 bg-teal-50/40 hover:bg-teal-50',
  absence_days: 'border-l-amber-400 bg-amber-50/40 hover:bg-amber-50',
  training_compliance: 'border-l-indigo-400 bg-indigo-50/40 hover:bg-indigo-50',
  payroll_receipts: 'border-l-emerald-400 bg-emerald-50/40 hover:bg-emerald-50',
};

type Library = ReportBootstrap & { legacy?: ReportListItem[] };
type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult: (event: { results: { transcript: string }[][] }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
};
export function ReportWorkspace() {
  const { currentCompanyId, user } = useAuth();
  return currentCompanyId ? (
    <Workspace
      key={`${currentCompanyId}:${user?.id}`}
      companyId={currentCompanyId}
    />
  ) : (
    <p className="p-8 text-muted-foreground">
      Selecciona una empresa para consultar sus reportes.
    </p>
  );
}
function Workspace({ companyId }: { companyId: string }) {
  const { companies } = useAuth();
  const companyName =
    companies.find((c) => c.id === companyId)?.name || 'Empresa activa';
  const [library, setLibrary] = useState<Library>(),
    [question, setQuestion] = useState(''),
    [filters, setFilters] = useState<ReportFilters>({}),
    [report, setReport] = useState<ReportResult>();
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [clarification, setClarification] = useState(''),
    [notice, setNotice] = useState(''),
    [mobileOpen, setMobileOpen] = useState(false);
  const [rename, setRename] = useState<Favorite>(),
    [title, setTitle] = useState(''),
    [listening, setListening] = useState(false);
  const request = useRef<AbortController>();
  const speech = useRef<Recognition>();
  const alive = useRef(true);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const data = await reportRequest<Library>(
        companyId,
        'bootstrap',
        {},
        signal,
      );
      if (alive.current) setLibrary(data);
    },
    [companyId],
  );
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    refresh(controller.signal)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (alive.current) setLoading(false);
      });
    return () => {
      alive.current = false;
      controller.abort();
      request.current?.abort();
      speech.current?.stop();
    };
  }, [companyId, refresh]);
  async function run(action: string, payload: Record<string, unknown> = {}) {
    speech.current?.stop();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    setClarification('');
    setNotice('');
    setMobileOpen(false);
    try {
      const data = await reportRequest<
        ReportResult | { status: 'clarification'; message: string }
      >(companyId, action, payload, controller.signal);
      if (controller.signal.aborted || !alive.current) return;
      if ('status' in data) {
        setClarification(data.message);
        questionRef.current?.focus();
      } else {
        setReport(data);
        if (action !== 'get' || report?.id !== data.id) {
          setQuestion(data.question);
          setFilters(data.filters);
        }
        if (action !== 'get') await refresh(controller.signal);
      }
    } catch (e) {
      if (!controller.signal.aborted && alive.current) {
        setError((e as Error).message);
        if (
          ['STALE_ACCESS', 'FORBIDDEN', 'NOT_FOUND'].includes(
            (e as Error & { code?: string }).code || '',
          )
        )
          setReport(undefined);
      }
    } finally {
      if (alive.current && request.current === controller) setBusy(false);
    }
  }
  async function mutate(action: string, payload: Record<string, unknown>) {
    setError('');
    try {
      await reportRequest(companyId, action, payload);
      await refresh();
      if (alive.current)
        setNotice(
          action === 'favorite'
            ? 'Reporte guardado en Favoritas.'
            : 'Favoritas actualizadas.',
        );
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    }
  }
  function dictate() {
    if (listening) {
      speech.current?.stop();
      return;
    }
    const RecognitionClass =
      (
        window as unknown as {
          SpeechRecognition?: new () => Recognition;
          webkitSpeechRecognition?: new () => Recognition;
        }
      ).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => Recognition })
        .webkitSpeechRecognition;
    if (!RecognitionClass) {
      setNotice('Tu navegador no admite dictado. Puedes escribir la pregunta.');
      return;
    }
    const recognition = new RecognitionClass();
    recognition.lang = 'es-CO';
    recognition.interimResults = false;
    recognition.onresult = (event) =>
      setQuestion((q) =>
        `${q} ${event.results[0][0].transcript}`.trim().slice(0, 2000),
      );
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setNotice(
        'No se pudo iniciar el dictado. Revisa el permiso del micrófono.',
      );
    };
    speech.current = recognition;
    setListening(true);
    recognition.start();
  }
  const sidebar = (
    <div className="space-y-7">
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">Favoritas</h2>
          <span className="text-xs text-muted-foreground ml-auto">
            {library?.favorites.length || 0}
          </span>
        </div>
        {!library?.favorites.length && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Guarda tus reportes habituales y ejecútalos de nuevo con datos
            actuales.
          </p>
        )}
        <div className="space-y-2">
          {library?.favorites.map((f) => (
            <div key={f.id} className="rounded-xl border bg-card p-3 group">
              <button
                disabled={busy}
                className="text-left text-sm font-medium hover:text-primary w-full"
                onClick={() => run('rerun', { id: f.id })}
              >
                {f.title}
              </button>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-muted-foreground">
                  Volver a ejecutar
                </span>
                <div className="flex">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label={`Renombrar ${f.title}`}
                    onClick={() => {
                      setRename(f);
                      setTitle(f.title);
                    }}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label={`Eliminar favorita ${f.title}`}
                    onClick={() => mutate('delete', { id: f.id })}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <div className="flex items-center gap-2 mb-4">
          <History className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">Recientes</h2>
        </div>
        {!library?.recent.length && (
          <p className="text-sm text-muted-foreground">
            Tus últimas consultas aparecerán aquí.
          </p>
        )}
        <div className="space-y-1">
          {library?.recent.map((r) => (
            <button
              key={r.id}
              disabled={busy}
              className="block text-left w-full rounded-lg p-3 hover:bg-secondary"
              onClick={() => {
                setQuestion(r.question);
                setFilters(r.filters);
                run('get', { id: r.id });
              }}
            >
              <span className="block text-sm line-clamp-2">{r.title}</span>
              <span className="block text-[11px] mt-1 text-muted-foreground">
                {new Date(r.createdAt).toLocaleDateString('es-CO')}
                {r.parentId ? ' · Refinamiento' : ''}
              </span>
            </button>
          ))}
        </div>
      </section>
      {!!library?.legacy?.length && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            Consultas antiguas
          </summary>
          <p className="text-xs text-muted-foreground my-3">
            Conservan el texto y necesitan una nueva ejecución.
          </p>
          {library.legacy.map((r) => (
            <button
              key={r.id}
              className="block text-left p-2 hover:text-primary"
              disabled={busy}
              onClick={() => run('legacy', { id: r.id, filters })}
            >
              {r.title}
            </button>
          ))}
        </details>
      )}
    </div>
  );
  return (
    <div className="h-full overflow-y-auto bg-[#f5f8fa]">
      <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
        <header className="flex items-start justify-between gap-3 mb-7">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary mb-2">
              <Sparkles className="h-4 w-4" />
              INTELIGENCIA PARA TU EQUIPO
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Asistente de Reportes
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Pregunta, conecta información y encuentra respuestas en{' '}
              {companyName}.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label="Nuevo reporte"
              onClick={() => {
                request.current?.abort();
                setBusy(false);
                setReport(undefined);
                setQuestion('');
                setClarification('');
                setError('');
                questionRef.current?.focus();
              }}
            >
              <Plus className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Nuevo reporte</span>
            </Button>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Abrir favoritas e historial"
                >
                  <History className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <div className="h-full overflow-y-auto px-5 py-6">
                  <SheetHeader className="mb-7">
                    <SheetTitle>Mis reportes</SheetTitle>
                    <SheetDescription className="sr-only">
                      Favoritas y consultas recientes de la empresa activa.
                    </SheetDescription>
                  </SheetHeader>
                  {sidebar}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_310px] gap-6">
          <main className="min-w-0 space-y-5">
            <form
              className="rounded-2xl border border-t-[3px] border-t-primary/60 bg-gradient-to-br from-sky-50/60 via-card to-card p-5 sm:p-7 shadow-sm"
              onSubmit={(e) => {
                e.preventDefault();
                run('generate', { question, filters });
              }}
            >
              <label
                htmlFor="report-question"
                className="font-semibold text-base"
              >
                ¿Qué te gustaría conocer?
              </label>
              <Textarea
                ref={questionRef}
                id="report-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Por ejemplo: ¿cuántos empleados activos tenemos en cada centro?"
                className="mt-3 min-h-[110px] resize-y bg-card text-base"
                maxLength={2000}
                disabled={busy}
              />
              <div className="flex flex-wrap gap-3 mt-4 items-end">
                <div>
                  <label
                    htmlFor="report-start"
                    className="block text-xs text-muted-foreground mb-1"
                  >
                    Desde
                  </label>
                  <Input
                    id="report-start"
                    type="date"
                    className="w-36"
                    value={filters.startDate || ''}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        startDate: e.target.value || undefined,
                      }))
                    }
                  />
                </div>
                <div>
                  <label
                    htmlFor="report-end"
                    className="block text-xs text-muted-foreground mb-1"
                  >
                    Hasta
                  </label>
                  <Input
                    id="report-end"
                    type="date"
                    className="w-36"
                    value={filters.endDate || ''}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        endDate: e.target.value || undefined,
                      }))
                    }
                  />
                </div>
                <details className="relative">
                  <summary className="cursor-pointer border rounded-md p-2 text-sm">
                    {filters.centerIds?.length
                      ? `${filters.centerIds.length} centros`
                      : 'Todos mis centros'}
                  </summary>
                  <div className="absolute z-20 mt-2 bg-card border rounded-xl p-3 shadow-lg w-64 max-h-60 overflow-y-auto">
                    {library?.centers.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 text-sm py-2"
                      >
                        <input
                          type="checkbox"
                          checked={filters.centerIds?.includes(c.id) || false}
                          onChange={(e) =>
                            setFilters((f) => ({
                              ...f,
                              centerIds: e.target.checked
                                ? [...(f.centerIds || []), c.id]
                                : (f.centerIds || []).filter(
                                    (id) => id !== c.id,
                                  ),
                            }))
                          }
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </details>
                <div className="ml-auto flex gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant={listening ? 'secondary' : 'ghost'}
                    aria-label={
                      listening ? 'Detener dictado' : 'Dictar pregunta'
                    }
                    onClick={dictate}
                  >
                    <Mic
                      className={`w-4 h-4 ${listening ? 'text-red-500 animate-pulse' : ''}`}
                    />
                  </Button>
                  <Button
                    type="submit"
                    disabled={busy || loading || !library || !question.trim()}
                  >
                    {busy ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Generar reporte
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
                <ShieldCheck className="w-3 h-3" />
                Empresa activa: {companyName} · Solo información autorizada
              </div>
            </form>
            {loading && (
              <div
                role="status"
                className="p-10 text-center text-muted-foreground"
              >
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
                Cargando tus fuentes y reportes…
              </div>
            )}
            {busy && (
              <div
                role="status"
                className="p-4 rounded-xl border bg-primary/5 flex items-center gap-3 text-sm"
              >
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Consultando y verificando los datos…
                <Button
                  className="ml-auto"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    request.current?.abort();
                    setBusy(false);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            )}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
              >
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                  <p>{error}</p>
                </div>
                {!library && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setLoading(true);
                      refresh()
                        .then(() => setError(''))
                        .catch((e) => setError(e.message))
                        .finally(() => setLoading(false));
                    }}
                  >
                    Reintentar
                  </Button>
                )}
              </div>
            )}
            {clarification && (
              <div
                role="status"
                className="rounded-xl border border-amber-300 bg-amber-50 p-5"
              >
                <h2 className="font-medium text-sm">
                  Necesito precisar tu consulta
                </h2>
                <p className="text-sm mt-2">{clarification}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Ajusta la pregunta o los filtros y vuelve a generar el
                  reporte.
                </p>
              </div>
            )}
            {notice && (
              <p role="status" className="text-sm text-primary">
                {notice}
              </p>
            )}
            {report ? (
              <ReportResults
                key={report.id}
                report={report}
                companyId={companyId}
                companyName={companyName}
                busy={busy}
                onPage={(params) => run('get', { id: report.id, ...params })}
                onFavorite={() => mutate('favorite', { id: report.id })}
                onRefine={(q) => {
                  setQuestion(q);
                  run('generate', {
                    question: q,
                    filters,
                    parentId: report.id,
                  });
                }}
              />
            ) : (
              !loading &&
              library && (
                <section className="rounded-2xl border border-sky-200/70 bg-white/80 p-6 sm:p-8">
                  <div className="mb-4 inline-flex rounded-xl bg-sky-100/70 p-3">
                    <BarChart3 className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">
                    De una pregunta a una visión completa
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2 mb-6">
                    Explora {library.sources.length} fuentes disponibles para tu
                    perfil. Elige un punto de partida o escribe tu propia
                    pregunta.
                  </p>
                  <label
                    className="block text-xs text-muted-foreground mb-2"
                    htmlFor="report-source-example"
                  >
                    Ejemplos por módulo
                  </label>
                  <select
                    id="report-source-example"
                    className="w-full rounded-md border bg-card p-2 text-sm mb-4"
                    defaultValue=""
                    onChange={(e) => {
                      const source = library.sources.find(
                        (s) => s.key === e.target.value,
                      );
                      if (source) {
                        setQuestion(
                          `Muéstrame un listado de ${source.label.toLocaleLowerCase()}`,
                        );
                        questionRef.current?.focus();
                      }
                    }}
                  >
                    <option value="" disabled>
                      Explorar todas las fuentes disponibles
                    </option>
                    {library.sources.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {library.sources
                      .filter((s) =>
                        [
                          'employees_v2',
                          'contracts',
                          'time_clock_days',
                          'absence_days',
                          'training_compliance',
                          'payroll_receipts',
                        ].includes(s.key),
                      )
                      .map((s) => (
                        <button
                          key={s.key}
                          className={`text-left rounded-xl border border-l-[3px] p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${exampleAccents[s.key] || 'border-l-primary/40 bg-card hover:bg-primary/5'}`}
                          onClick={() => {
                            setQuestion(
                              s.key === 'employees_v2'
                                ? 'Empleados activos por centro'
                                : `Muéstrame un listado de ${s.label.toLocaleLowerCase()}`,
                            );
                            questionRef.current?.focus();
                          }}
                        >
                          <span className="text-sm font-medium">{s.label}</span>
                          <span className="block text-xs text-muted-foreground mt-1">
                            Explorar información →
                          </span>
                        </button>
                      ))}
                  </div>
                </section>
              )
            )}
          </main>
          <aside
            className="hidden lg:block rounded-2xl border bg-white/60 p-5 self-start sticky top-0 max-h-[calc(100vh-180px)] overflow-y-auto"
            aria-label="Mis reportes"
          >
            {sidebar}
          </aside>
        </div>
      </div>
      <Dialog
        open={!!rename}
        onOpenChange={(open) => {
          if (!open) setRename(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar favorita</DialogTitle>
            <DialogDescription>
              Elige un nombre para encontrar este reporte fácilmente.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (rename) {
                mutate('rename', { id: rename.id, title });
                setRename(undefined);
              }
            }}
          >
            <Input
              aria-label="Nombre del reporte favorito"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              autoFocus
            />
            <Button className="mt-4" disabled={!title.trim()}>
              Guardar nombre
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
