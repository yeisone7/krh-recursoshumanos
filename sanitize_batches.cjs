const fs = require('fs');
const path = require('path');

function sanitizeSql(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix scientific notation like '4,517E+11'
    content = content.replace(/'(\d+,\d+)E\+(\d+)'/g, (match, valStr, exponent) => {
        const val = parseFloat(valStr.replace(',', '.'));
        const newVal = (val * Math.pow(10, parseInt(exponent))).toFixed(0);
        return `'${newVal}'`;
    });

    // Fix 'NULL' or 'Null' inside quotes
    content = content.replace(/'NULL'/gi, 'NULL');

    fs.writeFileSync(filePath, content, 'utf8');
}

const basePath = 'c:\\Users\\YEISON\\Proyectos AI\\krh-recursoshumanos';
for (let i = 1; i <= 18; i++) {
    const fileName = `import_batch_v2_${i}.sql`;
    const filePath = path.join(basePath, fileName);
    if (fs.existsSync(filePath)) {
        console.log(`Sanitizing ${fileName}...`);
        sanitizeSql(filePath);
    } else {
        console.log(`File ${fileName} not found.`);
    }
}
