import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: companies, error: err1 } = await supabase.from('companies').select('id').limit(1);
  if (err1) {
    console.error("Error fetching company", err1);
    return;
  }
  if (!companies || companies.length === 0) {
    console.error("No companies found");
    return;
  }
  const companyId = companies[0].id;

  const { data, error } = await supabase.from('training_courses').insert({
    company_id: companyId,
    name: 'Test Course IA',
    category: '',
    modality: 'presencial',
    duration_hours: 30,
    is_mandatory: false,
    requires_certification: false,
    validity_months: null,
    level: 'básico', // testing the accent
    language: 'es',
    risk_level: 'medio',
    status: 'borrador',
    is_active: true
  }).select();

  if (error) {
    console.error("INSERT ERROR:", error);
  } else {
    console.log("INSERT SUCCESS:", data);
    // clean up
    await supabase.from('training_courses').delete().eq('id', data[0].id);
  }
}

test();
