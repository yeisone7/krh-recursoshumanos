import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';
import {
  structured,
  providerSettings,
  PLAN_SCHEMA,
  obj,
} from '../_shared/reporting/provider.ts';
import {
  ReportError,
  validatePlan,
  validateFilters,
  bogotaToday,
  reconcileScreenPeriod,
} from '../_shared/reporting/validation.ts';
import { ROUTING_INSTRUCTION, planningInstruction, assertQuestionSemantics, explainReport } from '../_shared/reporting/planning.ts';
import type { PlanningResponse, ReportPlan, Source } from '../_shared/reporting/types.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
function databaseError(error: { message: string }) {
  const code =
    error.message.match(
      /FORBIDDEN|EXPORT_FORBIDDEN|STALE_ACCESS|NOT_FOUND|CLARIFICATION|RESULT_TOO_LARGE|CONTEXT_LIMIT|INVALID_PLAN/,
    )?.[0] || 'QUERY_ERROR';
  const messages: Record<string, string> = {
    FORBIDDEN: 'No tienes permiso para consultar estas fuentes.',
    EXPORT_FORBIDDEN: 'No tienes permiso para exportar estas fuentes.',
    STALE_ACCESS: 'Tus permisos cambiaron. Ejecuta de nuevo el reporte.',
    NOT_FOUND: 'Reporte no disponible.',
    CLARIFICATION: 'Selecciona un periodo para comparar.',
    RESULT_TOO_LARGE:
      'El resultado supera 50.000 filas o 16 MB. Reduce el periodo o agrega filtros; no se ha recortado el reporte.',
    CONTEXT_LIMIT: 'Inicia un nuevo reporte para continuar.',
    INVALID_PLAN: 'La consulta contiene campos u operaciones no admitidos.',
  };
  return new ReportError(
    code,
    (code === 'CLARIFICATION'
      ? error.message.split('CLARIFICATION: ')[1]?.slice(0, 300)
      : messages[code]) ||
      'No fue posible consultar los datos. Reduce el periodo o vuelve a intentarlo.',
    code.includes('FORBIDDEN') ? 403 : 400,
  );
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no admitido' }, 405);
  const started = Date.now(),
    requestId = crypto.randomUUID();
  let action = 'unknown';
  let provider = '';
  let wantsV2 = false;
  const clarify = (message: string) =>
    json(
      wantsV2
        ? { version: 2, status: 'clarification', message }
        : {
            type: 'text',
            data: null,
            explanation: message,
            metadata: { provider },
          },
    );
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer '))
      throw new ReportError(
        'UNAUTHORIZED',
        'Inicia sesión para continuar.',
        401,
      );
    const client = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false },
      },
    );
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();
    if (authError || !user)
      throw new ReportError(
        'UNAUTHORIZED',
        'Tu sesión expiró. Inicia sesión nuevamente.',
        401,
      );
    const raw = await req.text();
    if (raw.length > 20000)
      throw new ReportError('INVALID_REQUEST', 'Solicitud demasiado extensa.');
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new ReportError('INVALID_REQUEST', 'Solicitud inválida.');
    }
    const company = body.companyId;
    if (body.version !== undefined && body.version !== 2)
      throw new ReportError(
        'INVALID_VERSION',
        'Actualiza la aplicación para utilizar este contrato de reportes.',
      );
    wantsV2 = body.version === 2;
    action = body.action || 'generate';
    if (typeof company !== 'string' || !/^[0-9a-f-]{36}$/i.test(company))
      throw new ReportError('INVALID_COMPANY', 'Selecciona una empresa.');
    const rpc = async (name: string, args: Record<string, unknown>) => {
      const { data, error } = await client.rpc(name, args);
      if (error) throw databaseError(error);
      return data;
    };
    const library = (
      a = 'list',
      id: string | null = null,
      title: string | null = null,
    ) =>
      rpc('ai_report_library', {
        p_company_id: company,
        p_action: a,
        p_id: id,
        p_title: title,
      });
    const get = async (id: string, exporting = false) =>
      explainReport(await rpc('get_ai_report', {
        p_company_id: company,
        p_id: id,
        p_offset: body.offset || 0,
        p_size: body.pageSize || 50,
        p_export: exporting,
        p_order: body.order || null,
        p_desc: !!body.desc,
        p_search: body.search || '',
      }));
    if (action === 'get' || action === 'export') {
      const result = await get(body.id, action === 'export');
      console.info(
        JSON.stringify({
          requestId,
          action,
          provider: result.provider,
          volume: result.rows.length,
          duration: Date.now() - started,
          status: 'success',
        }),
      );
      return json(result);
    }
    if (['favorite', 'rename', 'delete'].includes(action))
      return json(await library(action, body.id, body.title));
    const available = await library();
    // Administrative credentials only retrieve provider configuration after user authorization.
    // Every analytical read, saved report and export above/below uses the caller's JWT.
    const configClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );
    const { data: settings } = await configClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'ai_config')
      .eq('company_id', company)
      .maybeSingle();

    const config = settings?.config_value || {};
    provider = config.model || 'gemini';
    if (action === 'bootstrap') return json({ ...available, provider });
    if (!['generate', 'rerun', 'legacy'].includes(action))
      throw new ReportError('INVALID_ACTION', 'Acción desconocida.');
    let question = String(body.question || '').trim(),
      filters = validateFilters(body.filters || {}),
      context: string[] = [];
    let previousDefinition: unknown = null;
    if (action === 'rerun') {
      const favorite = await library('favorite_get', body.id);
      question = favorite.question;
      context = favorite.context;
      filters = validateFilters(favorite.filters);
    }
    if (action === 'legacy') {
      const { data } = await client
        .from('ai_chat_messages')
        .select('content,ai_chat_conversations!inner(user_id,company_id)')
        .eq('conversation_id', body.id)
        .eq('ai_chat_conversations.user_id', user.id)
        .eq('ai_chat_conversations.company_id', company)
        .eq('role', 'user')
        .order('created_at')
        .limit(1)
        .maybeSingle();
      if (!data)
        throw new ReportError(
          'NOT_FOUND',
          'Consulta antigua no disponible.',
          404,
        );
      question = data.content;
    }
    if (body.parentId) {
      const parent = await get(body.parentId);
      context = [...(parent.context || []), parent.question];
      previousDefinition = {
        plan: parent.plan,
        filters: parent.filters,
        title: parent.title,
      };
    }
    if (!question || question.length > 2000)
      throw new ReportError(
        'INVALID_QUESTION',
        'Escribe una pregunta de hasta 2.000 caracteres.',
      );
    providerSettings(config);
    const sources: Source[] = available.sources;
    const routing = (await structured(
      config,
      ROUTING_INSTRUCTION,
      {
        question,
        context,
        previousDefinition,
        sources: sources.map((s) => ({
          key: s.key,
          label: s.label,
          description: s.description,
          fields: s.fields.map((field) => `${field.key}: ${field.label}`),
        })),
      },
      obj({
        sources: { type: 'array', items: { type: 'string' } },
        clarification: { type: ['string', 'null'] },
      }),
    )) as { sources: string[]; clarification: string | null };
    if (routing.clarification) return clarify(routing.clarification);
    if (
      !Array.isArray(routing.sources) ||
      routing.sources.length > 5 ||
      routing.sources.some((k) => !sources.some((s) => s.key === k))
    )
      throw new ReportError(
        'INVALID_RESPONSE',
        'El proveedor seleccionó fuentes no disponibles.',
        422,
      );
    const selected = sources.filter((s) => routing.sources.includes(s.key));
    const instruction = planningInstruction(bogotaToday());
    const input = {
      question,
      context,
      previousDefinition,
      screenFilters: filters,
      catalog: selected,
    };
    let response = (await structured(
      config,
      instruction,
      input,
      PLAN_SCHEMA,
    )) as PlanningResponse;
    if (response.clarification) return clarify(response.clarification);
    let plan: ReportPlan;
    try {
      plan = validatePlan(response.plan, selected);
      assertQuestionSemantics(plan, question, selected.find(s => s.key === plan.source)!, filters);
    } catch (error) {
      if (!(error instanceof ReportError) || error.status === 403) throw error;
      response = (await structured(
        config,
        instruction,
        { ...input, rejectedPlan: response.plan, validationError: error.message },
        PLAN_SCHEMA,
      )) as PlanningResponse;
      if (response.clarification) return clarify(response.clarification);
      plan = validatePlan(response.plan, selected);
      assertQuestionSemantics(plan, question, selected.find(s => s.key === plan.source)!, filters);
    }
    const source = selected.find((s) => s.key === plan.source)!;
    plan = reconcileScreenPeriod(plan, source, filters);
    const id = await rpc('create_ai_report', {
      p_company_id: company,
      p_plan: plan,
      p_filters: filters,
      p_question: question,
      p_title: String(response.title || question).slice(0, 160),
      p_provider: provider,
      p_parent_id: body.parentId || null,
      p_context: context,
    });
    const result = await get(id);
    console.info(
      JSON.stringify({
        requestId,
        action,
        provider,
        sources: result.sources?.map((s: { key: string }) => s.key),
        volume: result.totalRows,
        duration: Date.now() - started,
        status: 'success',
      }),
    );
    return json(
      body.version === 2
        ? result
        : {
            type: 'table',
            data: result.rows,
            explanation: result.summary,
            conversationId: id,
            metadata: {
              row_count: result.totalRows,
              provider,
              sourceTables: result.sources?.map((s: { key: string }) => s.key),
            },
          },
    );
  } catch (error) {
    const e =
      error instanceof ReportError
        ? error
        : new ReportError(
            'INTERNAL',
            'No fue posible generar el reporte. Tu pregunta se conserva para reintentar.',
            500,
          );
    console.error(
      JSON.stringify({
        requestId,
        action,
        provider,
        duration: Date.now() - started,
        status: 'error',
        code: e.code,
      }),
    );
    if (e.code === 'CLARIFICATION') return clarify(e.message);
    return json(
      { version: 2, error: e.message, code: e.code, requestId },
      e.status,
    );
  }
});
