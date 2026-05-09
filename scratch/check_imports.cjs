const fs = require('fs');
const path = require('path');

function findMissingImports(dir) {
  const files = fs.readdirSync(dir);
  let missingFiles = [];

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      missingFiles = missingFiles.concat(findMissingImports(fullPath));
    } else if (file.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const usesFilter = /<Filter\b/.test(content);
      const importsFilter = /import\s+{[^}]*\bFilter\b[^}]*}\s+from\s+['"]lucide-react['"]/.test(content);

      if (usesFilter && !importsFilter) {
        missingFiles.push(fullPath);
      }
    }
  }

  return missingFiles;
}

const missing = findMissingImports('src');
if (missing.length > 0) {
  console.log('Files with missing Filter import:');
  missing.forEach(f => console.log(f));
} else {
  console.log('No files with missing Filter import found.');
}
