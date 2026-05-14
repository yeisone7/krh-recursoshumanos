const fs = require('fs');

const content = fs.readFileSync('c:\\Users\\YEISON\\Proyectos AI\\krh-recursoshumanos\\scratch\\missing_inserts.sql', 'utf8');
const blocks = content.split(/INSERT INTO public\.employees_v2/).slice(1);

const batch1 = blocks.slice(0, 36).map(b => "INSERT INTO public.employees_v2" + b.replace(/END \$\$;/g, '').replace(/DO \$\$\s*DECLARE\s*emp_id UUID;\s*BEGIN/gi, '')).join('\nemp_id := NULL;\n');
const batch2 = blocks.slice(36).map(b => "INSERT INTO public.employees_v2" + b.replace(/END \$\$;/g, '').replace(/DO \$\$\s*DECLARE\s*emp_id UUID;\s*BEGIN/gi, '')).join('\nemp_id := NULL;\n');

fs.writeFileSync('c:\\Users\\YEISON\\Proyectos AI\\krh-recursoshumanos\\scratch\\recovery_batch1.sql', `DO $$ DECLARE emp_id UUID; BEGIN\n${batch1}\nEND $$;`, 'utf8');
fs.writeFileSync('c:\\Users\\YEISON\\Proyectos AI\\krh-recursoshumanos\\scratch\\recovery_batch2.sql', `DO $$ DECLARE emp_id UUID; BEGIN\n${batch2}\nEND $$;`, 'utf8');
console.log('Batches 1 and 2 generated.');
