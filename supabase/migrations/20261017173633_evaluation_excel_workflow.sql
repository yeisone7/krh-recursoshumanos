-- GH-FO-05-DR. Existing evaluations and templates are preserved.
alter table public.evaluation_templates add column preset_key text;
create unique index evaluation_templates_company_preset_key on public.evaluation_templates(company_id, preset_key) where preset_key is not null;
alter table public.evaluation_criteria add column dimension text, add column competency_description text;
alter table public.performance_evaluations
  add column evaluator_signature text, add column employee_signature text,
  add column evaluator_name text, add column position_name text,
  add column field_name text, add column manager_name text,
  add column evaluation_date date;

create or replace function public.save_evaluation_template(p_company_id uuid, p_template_id uuid, p_payload jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid; v_item jsonb; v_index integer := 0; v_locked boolean := false; v_existing jsonb; v_incoming jsonb;
begin
  if auth.uid() is null or not (public.is_super_admin() or (public.is_company_member(p_company_id) and
    (public.is_admin_or_rrhh() or public.check_user_permission(auth.uid(), 'evaluaciones', case when p_template_id is null then 'create' else 'update' end)))) then
    raise exception 'No tienes permiso para configurar evaluaciones';
  end if;
  if nullif(trim(p_payload->>'name'), '') is null or jsonb_typeof(p_payload->'criteria') is distinct from 'array' or jsonb_array_length(p_payload->'criteria') = 0 then
    raise exception 'La plantilla necesita nombre y criterios';
  end if;
  if jsonb_typeof(p_payload->'rating_scale') is distinct from 'array' then raise exception 'Configura la tabla de valores'; end if;
  if exists(select 1 from generate_series(0,100) n where (select count(*) from jsonb_array_elements(p_payload->'rating_scale') r where n between (r->>'min')::numeric and (r->>'max')::numeric and nullif(trim(r->>'label'),'') is not null) <> 1) then
    raise exception 'La tabla de valores debe cubrir de 0 a 100 sin huecos ni superposiciones';
  end if;
  if p_template_id is not null then
    select id into v_id from public.evaluation_templates where id=p_template_id and company_id=p_company_id for update;
    if v_id is null then raise exception 'Plantilla no disponible'; end if;
    v_locked := exists(select 1 from public.evaluation_cycles where template_id=v_id);
    if v_locked then
      select jsonb_agg(jsonb_build_object('name',name,'description',coalesce(description,''),'category',coalesce(category,'general'),
        'dimension',coalesce(dimension,''),'competency_description',coalesce(competency_description,''),'weight',coalesce(weight,1),'max_score',coalesce(max_score,4),
        'level_1_description',coalesce(level_1_description,''),'level_2_description',coalesce(level_2_description,''),
        'level_3_description',coalesce(level_3_description,''),'level_4_description',coalesce(level_4_description,'')) order by sort_order,id)
        into v_existing from public.evaluation_criteria where template_id=v_id;
      select jsonb_agg(jsonb_build_object('name',s->>'name','description',coalesce(s->>'description',''),'category',coalesce(s->>'category','general'),
        'dimension',coalesce(s->>'dimension',''),'competency_description',coalesce(s->>'competency_description',''),'weight',coalesce((s->>'weight')::numeric,1),'max_score',coalesce((s->>'max_score')::integer,4),
        'level_1_description',coalesce(s->>'level_1_description',''),'level_2_description',coalesce(s->>'level_2_description',''),
        'level_3_description',coalesce(s->>'level_3_description',''),'level_4_description',coalesce(s->>'level_4_description','')) order by n)
        into v_incoming from jsonb_array_elements(p_payload->'criteria') with ordinality as a(s,n);
      if v_existing is distinct from v_incoming or exists(select 1 from public.evaluation_templates where id=v_id and
        (rating_scale is distinct from p_payload->'rating_scale' or qualitative_questions is distinct from p_payload->'qualitative_questions')) then
        raise exception 'Esta plantilla ya tiene ciclos. Duplica la plantilla para cambiar los criterios sin alterar el historial';
      end if;
    end if;
    update public.evaluation_templates set name=p_payload->>'name', description=p_payload->>'description',
      is_active=coalesce((p_payload->>'is_active')::boolean,true), qualitative_questions=p_payload->'qualitative_questions', rating_scale=p_payload->'rating_scale'
    where id=v_id;
    if not v_locked then delete from public.evaluation_criteria where template_id=v_id; end if;
    delete from public.evaluation_template_positions where template_id=v_id;
  else
    insert into public.evaluation_templates(company_id,name,description,is_active,preset_key,qualitative_questions,rating_scale,created_by)
    values(p_company_id,p_payload->>'name',p_payload->>'description',coalesce((p_payload->>'is_active')::boolean,true),
      p_payload->>'preset_key',p_payload->'qualitative_questions',p_payload->'rating_scale',auth.uid()) returning id into v_id;
  end if;
  if not v_locked then
  for v_item in select value from jsonb_array_elements(p_payload->'criteria') loop
    if nullif(trim(v_item->>'name'),'') is null or coalesce((v_item->>'weight')::numeric,1) <= 0
      or coalesce((v_item->>'max_score')::integer,4) <> 4 then raise exception 'Los criterios requieren nombre, peso positivo y escala de 1 a 4'; end if;
    insert into public.evaluation_criteria(template_id,company_id,name,description,category,dimension,competency_description,weight,max_score,sort_order,
      level_1_description,level_2_description,level_3_description,level_4_description)
    values(v_id,p_company_id,v_item->>'name',v_item->>'description',v_item->>'category',v_item->>'dimension',v_item->>'competency_description',
      coalesce((v_item->>'weight')::numeric,1),4,v_index,v_item->>'level_1_description',v_item->>'level_2_description',v_item->>'level_3_description',v_item->>'level_4_description');
    v_index := v_index + 1;
  end loop;
  end if;
  for v_item in select value from jsonb_array_elements(coalesce(p_payload->'position_ids','[]'::jsonb)) loop
    if not exists(select 1 from public.positions where id=(v_item#>>'{}')::uuid and company_id=p_company_id) then raise exception 'Cargo no disponible en esta empresa'; end if;
    insert into public.evaluation_template_positions(template_id,position_id,company_id) values(v_id,(v_item#>>'{}')::uuid,p_company_id);
  end loop;
  return v_id;
end;
$$;
revoke all on function public.save_evaluation_template(uuid,uuid,jsonb) from public, anon;
grant execute on function public.save_evaluation_template(uuid,uuid,jsonb) to authenticated;

create or replace function public.save_performance_evaluation(p_id uuid, p_payload jsonb, p_scores jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_eval public.performance_evaluations; v_template public.evaluation_templates;
  v_item jsonb; v_count integer; v_answered integer; v_raw numeric; v_score numeric; v_rating text;
  v_finalize boolean := p_payload->>'status' = 'submitted';
begin
  select * into v_eval from public.performance_evaluations where id=p_id for update;
  if not found then raise exception 'Evaluación no disponible'; end if;
  if auth.uid() is null or not (public.is_super_admin() or (public.is_company_member(v_eval.company_id) and
    (public.is_admin_or_rrhh() or public.check_user_permission(auth.uid(),'evaluaciones','update')))) then
    raise exception 'No tienes permiso para calificar evaluaciones';
  end if;
  if v_eval.status not in ('pending','in_progress') then raise exception 'La evaluación finalizada no puede modificarse'; end if;
  if coalesce(p_payload->>'status','') not in ('in_progress','submitted') then raise exception 'Estado inválido'; end if;
  select t.* into v_template from public.evaluation_templates t join public.evaluation_cycles c on c.template_id=t.id
    where c.id=v_eval.cycle_id and c.company_id=v_eval.company_id and t.company_id=v_eval.company_id;
  if not found then raise exception 'El ciclo necesita una plantilla'; end if;
  if jsonb_typeof(p_scores) is distinct from 'array' then raise exception 'Calificaciones inválidas'; end if;
  if exists(select 1 from jsonb_array_elements(p_scores) s group by s->>'criteria_id' having count(*)>1) then raise exception 'Criterios duplicados'; end if;
  for v_item in select value from jsonb_array_elements(p_scores) loop
    if not exists(select 1 from public.evaluation_criteria where id=(v_item->>'criteria_id')::uuid and template_id=v_template.id and company_id=v_eval.company_id)
      or coalesce((v_item->>'score')::numeric,0) not in (1,2,3,4) then raise exception 'Criterio o calificación inválida'; end if;
  end loop;
  select count(*) into v_count from public.evaluation_criteria where template_id=v_template.id;
  v_answered := jsonb_array_length(p_scores);
  if v_count=0 then raise exception 'La plantilla no tiene criterios'; end if;
  if v_finalize and v_answered<>v_count then raise exception 'Debes calificar todos los criterios'; end if;
  if v_finalize and (nullif(trim(p_payload->>'evaluator_name'),'') is null or nullif(trim(p_payload->>'manager_name'),'') is null
    or nullif(trim(p_payload->>'position_name'),'') is null or nullif(trim(p_payload->>'field_name'),'') is null or nullif(p_payload->>'evaluation_date','') is null) then
    raise exception 'Completa los datos de la evaluación'; end if;
  if v_finalize and (coalesce(p_payload->>'employee_signature','') not like 'data:image/png;base64,%'
    or coalesce(p_payload->>'evaluator_signature','') not like 'data:image/png;base64,%') then raise exception 'Faltan las firmas'; end if;
  if v_answered=v_count then
    select sum((s->>'score')::numeric / c.max_score * coalesce(c.weight,1)) / nullif(sum(coalesce(c.weight,1)),0) * 100
      into v_raw from jsonb_array_elements(p_scores) s join public.evaluation_criteria c on c.id=(s->>'criteria_id')::uuid;
    v_score := round(v_raw,2);
    select r->>'label' into v_rating from jsonb_array_elements(v_template.rating_scale) r
      where round(v_raw) between (r->>'min')::numeric and (r->>'max')::numeric limit 1;
    if v_score is null or v_rating is null then raise exception 'Revisa los pesos y la escala de la plantilla'; end if;
  end if;
  delete from public.evaluation_scores where evaluation_id=p_id;
  insert into public.evaluation_scores(evaluation_id,company_id,criteria_id,score,comments)
    select p_id,v_eval.company_id,(s->>'criteria_id')::uuid,(s->>'score')::numeric,s->>'comments' from jsonb_array_elements(p_scores) s;
  update public.performance_evaluations set status=(p_payload->>'status')::public.evaluation_status,
    overall_score=v_score,overall_rating=v_rating,strengths=p_payload->>'strengths',areas_to_improve=p_payload->>'areas_to_improve',
    development_plan=p_payload->>'development_plan',employee_comments=p_payload->>'employee_comments',
    evaluator_signature=p_payload->>'evaluator_signature',employee_signature=p_payload->>'employee_signature',
    evaluator_name=p_payload->>'evaluator_name',manager_name=p_payload->>'manager_name',position_name=p_payload->>'position_name',
    field_name=p_payload->>'field_name',evaluation_date=nullif(p_payload->>'evaluation_date','')::date,
    submitted_at=case when v_finalize then now() else null end, evaluator_id=auth.uid()
    where id=p_id;
end;
$$;
revoke all on function public.save_performance_evaluation(uuid,jsonb,jsonb) from public, anon;
grant execute on function public.save_performance_evaluation(uuid,jsonb,jsonb) to authenticated;

-- Validate both individual and bulk assignments at the database boundary.
create or replace function public.validate_evaluation_assignment()
returns trigger language plpgsql security invoker set search_path = public as $$
declare v_template public.evaluation_templates; v_position uuid;
begin
  if tg_op='UPDATE' and (new.cycle_id,new.employee_id,new.company_id) is not distinct from (old.cycle_id,old.employee_id,old.company_id) then return new; end if;
  if tg_op='UPDATE' and exists(select 1 from public.evaluation_scores where evaluation_id=old.id) then raise exception 'No puedes reasignar una evaluación con calificaciones'; end if;
  select t.* into v_template from public.evaluation_cycles c join public.evaluation_templates t on t.id=c.template_id
    where c.id=new.cycle_id and c.company_id=new.company_id and t.company_id=new.company_id and c.status in ('draft','active') and t.is_active;
  if not found then raise exception 'Selecciona un ciclo vigente con plantilla activa'; end if;
  if not exists(select 1 from public.employees_v2 where id=new.employee_id and company_id=new.company_id) then raise exception 'Empleado no disponible'; end if;
  select position_id into v_position from public.employee_work_info where employee_id=new.employee_id and company_id=new.company_id and is_current=true order by valid_from desc limit 1;
  if (v_template.preset_key is not null or exists(select 1 from public.evaluation_template_positions where template_id=v_template.id))
    and not exists(select 1 from public.evaluation_template_positions where template_id=v_template.id and position_id=v_position and company_id=new.company_id) then
    raise exception 'El cargo del empleado no está asociado a esta plantilla';
  end if;
  return new;
end;
$$;
create trigger validate_evaluation_assignment before insert or update on public.performance_evaluations for each row execute function public.validate_evaluation_assignment();

-- A cycle's template is the historical definition of its evaluations.
create or replace function public.protect_evaluation_cycle_template()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.template_id is distinct from old.template_id and exists(select 1 from public.performance_evaluations where cycle_id=old.id) then
    raise exception 'No puedes cambiar la plantilla de un ciclo con evaluaciones';
  end if;
  return new;
end;
$$;
create trigger protect_evaluation_cycle_template before update on public.evaluation_cycles for each row execute function public.protect_evaluation_cycle_template();

create or replace function public.guard_evaluation_completion()
returns trigger language plpgsql security invoker set search_path = public as $$
declare v_template uuid; v_count integer; v_answered integer; v_raw numeric; v_scale jsonb;
begin
  if tg_op='INSERT' then
    if new.status <> 'pending' or new.overall_score is not null or new.overall_rating is not null then raise exception 'Una evaluación nueva debe estar pendiente y sin calificación'; end if;
    return new;
  end if;
  if old.status in ('submitted','reviewed','approved') then
    if (to_jsonb(new)-'status'-'reviewed_at'-'reviewed_by'-'updated_at') is distinct from (to_jsonb(old)-'status'-'reviewed_at'-'reviewed_by'-'updated_at') then
      raise exception 'Las respuestas de una evaluación finalizada no pueden modificarse';
    end if;
    if new.status<>old.status and not ((old.status='submitted' and new.status='reviewed') or (old.status='reviewed' and new.status='approved')) then
      raise exception 'Transición de estado no permitida';
    end if;
    return new;
  end if;
  if new.status in ('reviewed','approved') then raise exception 'Primero debes finalizar la evaluación'; end if;
  select t.id,t.rating_scale into v_template,v_scale from public.evaluation_cycles c join public.evaluation_templates t on t.id=c.template_id where c.id=new.cycle_id;
  select count(*) into v_count from public.evaluation_criteria where template_id=v_template;
  select count(*),sum(s.score/c.max_score*coalesce(c.weight,1))/nullif(sum(coalesce(c.weight,1)),0)*100 into v_answered,v_raw
    from public.evaluation_scores s join public.evaluation_criteria c on c.id=s.criteria_id where s.evaluation_id=new.id and c.template_id=v_template and s.score in (1,2,3,4);
  new.overall_score := null; new.overall_rating := null;
  if v_count>0 and v_answered=v_count then
    new.overall_score := round(v_raw,2);
    select r->>'label' into new.overall_rating from jsonb_array_elements(v_scale) r where round(v_raw) between (r->>'min')::numeric and (r->>'max')::numeric limit 1;
  end if;
  if new.status='submitted' then
    if new.overall_rating is null then raise exception 'Completa todos los criterios antes de finalizar'; end if;
    if coalesce(new.employee_signature,'') not like 'data:image/png;base64,%' or coalesce(new.evaluator_signature,'') not like 'data:image/png;base64,%' then raise exception 'Faltan las firmas'; end if;
    new.submitted_at := now();
  end if;
  return new;
end;
$$;
create trigger guard_evaluation_completion before insert or update on public.performance_evaluations for each row execute function public.guard_evaluation_completion();

create or replace function public.guard_evaluation_score()
returns trigger language plpgsql security invoker set search_path = public as $$
declare v_eval public.performance_evaluations; v_template uuid;
begin
  select * into v_eval from public.performance_evaluations where id=case when tg_op='DELETE' then old.evaluation_id else new.evaluation_id end for update;
  -- Allow the existing cascade when an evaluation itself is deleted.
  if not found and tg_op='DELETE' then return old; end if;
  if v_eval.id is null or v_eval.status not in ('pending','in_progress') then raise exception 'No puedes modificar respuestas finalizadas'; end if;
  if tg_op='DELETE' then return old; end if;
  if tg_op='UPDATE' and (new.evaluation_id,new.criteria_id,new.company_id) is distinct from (old.evaluation_id,old.criteria_id,old.company_id) then raise exception 'No puedes reasignar una respuesta'; end if;
  select template_id into v_template from public.evaluation_cycles where id=v_eval.cycle_id;
  if new.company_id<>v_eval.company_id or new.score not in (1,2,3,4) or not exists(select 1 from public.evaluation_criteria where id=new.criteria_id and template_id=v_template and company_id=new.company_id) then
    raise exception 'Criterio o calificación inválida';
  end if;
  return new;
end;
$$;
create trigger guard_evaluation_score before insert or update or delete on public.evaluation_scores for each row execute function public.guard_evaluation_score();
