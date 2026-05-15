
import fs from 'fs';

const content = fs.readFileSync('src/pages/Configuracion.tsx', 'utf8');

// Find all used components (capitalized tags)
const tagMatches = content.match(/<([A-Z][a-zA-Z0-9]*)/g) || [];
const usedTags = [...new Set(tagMatches.map(t => t.slice(1)))];

// Find all imported items from lucide-react
const lucideMatch = content.match(/import\s*{([^}]*)}\s*from\s*'lucide-react'/);
const importedLucide = lucideMatch ? lucideMatch[1].split(',').map(s => s.trim().split(' as ')[0].trim()).filter(s => s) : [];

// Find all other imports
const allImports = content.match(/import\s+([a-zA-Z0-9_{},\s]*)from/g) || [];
const importedItems = allImports.flatMap(i => {
  const match = i.match(/import\s+({?|)([a-zA-Z0-9_{},\s]*)(}?|)\s+from/);
  if (!match) return [];
  return match[2].split(',').map(s => s.trim().replace(/{|}/g, '').split(' as ')[0].trim()).filter(s => s);
});

const ignored = ['Fragment', 'Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue', 'Textarea', 'Tabs', 'TabsContent', 'TabsList', 'TabsTrigger', 'Card', 'CardContent', 'CardHeader', 'CardTitle', 'CardDescription', 'Button', 'Input', 'Skeleton', 'Label', 'Badge', 'Switch'];

console.log('Used Tags:', usedTags);
console.log('Imported Items:', importedItems);

const missing = usedTags.filter(t => !importedItems.includes(t) && !ignored.includes(t) && !t.startsWith('motion.'));

console.log('Potential Missing Imports:', missing);
