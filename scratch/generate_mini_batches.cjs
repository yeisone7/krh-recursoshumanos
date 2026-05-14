const fs = require('fs');

const content = fs.readFileSync('c:\\Users\\YEISON\\Proyectos AI\\krh-recursoshumanos\\scratch\\missing_inserts.sql', 'utf8');
const blocks = content.split(/INSERT INTO public\.employees_v2/).slice(1);

for (let i = 0; i < blocks.length; i += 5) {
    const batch = blocks.slice(i, i + 5).map(b => "INSERT INTO public.employees_v2" + b.replace(/END \$\$;/g, '').replace(/DO \$\$\s*DECLARE\s*emp_id UUID;\s*BEGIN/gi, '')).join('\nemp_id := NULL;\n');
    const sql = `DO $$ DECLARE emp_id UUID; BEGIN\n${batch}\nEND $$;`;
    fs.writeFileSync(`c:\\Users\\YEISON\\Proyectos AI\\krh-recursoshumanos\\scratch\\recovery_mini_batch_${i/5 + 1}.sql`, sql, 'utf8');
}
console.log(`Generated ${Math.ceil(blocks.length / 5)} mini batches.`);
