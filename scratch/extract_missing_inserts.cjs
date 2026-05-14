const fs = require('fs');
const path = require('path');

const missingDocs = [
    '13722650','19472472','27600662','91497054','28218054','28313475','91459009','91355063','37745655','37754652',
    '91278586','39577832','91228137','91002571','13724296','79579527','78646300','77181089','1098261398','1102383694',
    '91451611','1097304812','91247339','1065238084','18762271','37745200','91480320','33516084','85476893','1098743637',
    '1096219417','1098628520','91250092','1065243336','91047791','1091678380','1102348513','1098622016','91536373',
    '91466779','63491036','1098675146','28205535','85476636','1042436886','1095906624','1085169093','37546368',
    '1006860429','1095927488','1005485167','1098721186','1095795080','1005338656','1116794880','1005155428',
    '1098674585','37557038','80132968','17954026','1129514420','1116789554','37555921','17594332','1116789890',
    '1115739501','78294616','1098636280','60370013','1116858893','17591271','68302142'
];

const batchDir = 'c:\\Users\\YEISON\\Proyectos AI\\krh-recursoshumanos\\combined_batches';
const missingSet = new Set(missingDocs);
const outputStatements = [];

fs.readdirSync(batchDir).forEach(filename => {
    if (filename.startsWith('part_') && filename.endsWith('.sql')) {
        const filePath = path.join(batchDir, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Find full blocks starting with INSERT INTO public.employees_v2
        const rawBlocks = content.split(/INSERT INTO public\.employees_v2/);
        rawBlocks.shift(); 
        
        rawBlocks.forEach(block => {
            // Reconstruct the full employee block
            let fullStatement = "INSERT INTO public.employees_v2" + block;
            
            // Cleanup: remove END $$; or other part footers if present
            fullStatement = fullStatement.replace(/END \$\$;/g, '');
            fullStatement = fullStatement.replace(/DO \$\$\s*DECLARE\s*emp_id UUID;\s*BEGIN/gi, '');
            
            for (const doc of missingSet) {
                if (fullStatement.includes(`'${doc}'`)) {
                    // Extract only until the next emp_id := NULL; or similar logical end
                    // Actually, since we split by INSERT, it's mostly fine, but we need to stop before any END $$;
                    outputStatements.push(fullStatement.trim());
                    missingSet.delete(doc);
                    break;
                }
            }
        });
    }
});

const output = `-- Found ${outputStatements.length} statements out of ${missingDocs.length}\n\n` + outputStatements.join('\n\n');
fs.writeFileSync('c:\\Users\\YEISON\\Proyectos AI\\krh-recursoshumanos\\scratch\\missing_inserts.sql', output, 'utf8');
console.log(`-- Saved ${outputStatements.length} statements to scratch/missing_inserts.sql`);
