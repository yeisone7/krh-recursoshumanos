const fs = require('fs');
const path = require('path');

const missing_docs = [
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
const results = {};

fs.readdirSync(batchDir).forEach(filename => {
    if (filename.startsWith('part_') && filename.endsWith('.sql')) {
        const filePath = path.join(batchDir, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        missing_docs.forEach(doc => {
            if (content.includes(doc)) {
                if (!results[filename]) {
                    results[filename] = [];
                }
                results[filename].push(doc);
            }
        });
    }
});

Object.keys(results).sort().forEach(batch => {
    console.log(`${batch}: ${results[batch].length} missing docs`);
});
