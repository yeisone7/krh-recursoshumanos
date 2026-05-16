
import fs from 'fs';
const data = JSON.parse(fs.readFileSync('C:\\Users\\YEISON\\.gemini\\antigravity\\brain\\5e5bcac7-adc2-429e-af04-72b38ad4b732\\.system_generated\\steps\\305\\output.txt', 'utf8'));
const table = data.tables.find(t => t.name === 'public.ai_chat_messages');
if (table) {
  console.log(JSON.stringify(table.columns.map(c => ({ name: c.name, is_nullable: c.is_nullable, default: c.default })), null, 2));
} else {
  console.log('Table not found');
}
