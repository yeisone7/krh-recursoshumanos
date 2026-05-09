const fs = require('fs');

const inputPath = 'C:\\Users\\YEISON\\.gemini\\antigravity\\brain\\12da31e2-01da-46c4-abe7-129d0c0c12bd\\.system_generated\\steps\\1293\\output.txt';

function extractData(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileData = JSON.parse(content);
    const resultStr = fileData.result;
    const start = resultStr.indexOf('[');
    const end = resultStr.lastIndexOf(']') + 1;
    return JSON.parse(resultStr.substring(start, end));
}

const data = extractData(inputPath);

const catalogMapping = {
    areas: {},
    opCenters: {},
    positions: {}
};

data.forEach(item => {
    if (item.type === 'area') catalogMapping.areas[item.name] = item.id;
    if (item.type === 'op_center') catalogMapping.opCenters[item.name] = item.id;
    if (item.type === 'position') catalogMapping.positions[item.name] = item.id;
});

fs.writeFileSync('c:\\Users\\YEISON\\Proyectos AI\\krh-recursoshumanos\\scratch\\catalog_mapping.json', JSON.stringify(catalogMapping, null, 2));
console.log('Catalog mapping saved to scratch/catalog_mapping.json');
