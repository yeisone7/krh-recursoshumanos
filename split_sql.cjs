const fs = require('fs');
const path = require('path');

const outputDir = path.join(process.cwd(), 'combined_batches');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

let combinedSql = '';
for (let i = 1; i <= 18; i++) {
  const filename = `import_batch_v2_${i}.sql`;
  const filePath = path.join(process.cwd(), filename);
  if (fs.existsSync(filePath)) {
    combinedSql += fs.readFileSync(filePath, 'utf8') + '\n';
  }
}

// Split by 'END $$;' to keep blocks intact
const blocks = combinedSql.split('END $$;');
let currentPart = '';
let partCount = 1;

for (let i = 0; i < blocks.length; i++) {
  let block = blocks[i].trim();
  if (block === '') continue;
  
  const blockWithEnd = block + '\nEND $$;';
  
  if (currentPart.length > 0 && (currentPart.length + blockWithEnd.length) > 75000) {
    fs.writeFileSync(path.join(outputDir, `part_${partCount}.sql`), currentPart);
    console.log(`Wrote part_${partCount}.sql (${currentPart.length} bytes)`);
    currentPart = blockWithEnd;
    partCount++;
  } else {
    currentPart += (currentPart ? '\n\n' : '') + blockWithEnd;
  }
}

if (currentPart.trim() !== '') {
  fs.writeFileSync(path.join(outputDir, `part_${partCount}.sql`), currentPart);
  console.log(`Wrote part_${partCount}.sql (${currentPart.length} bytes)`);
}

console.log(`Created ${partCount} parts in ${outputDir}`);
