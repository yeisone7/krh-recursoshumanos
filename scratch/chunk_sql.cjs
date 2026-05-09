const fs = require('fs');

const sql = fs.readFileSync('scratch/block3.sql', 'utf8');
const lines = sql.split('\n');
const chunkSize = 200; // lines

for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize).join('\n');
    if (chunk.trim()) {
        console.log(`--- CHUNK ${Math.floor(i / chunkSize) + 1} ---`);
        console.log(chunk);
    }
}
