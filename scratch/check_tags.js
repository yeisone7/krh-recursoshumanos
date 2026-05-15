
import fs from 'fs';

const files = [
  'src/pages/Configuracion.tsx',
  'src/pages/Auditoria.tsx',
  'src/pages/Seguridad.tsx',
  'src/pages/SuperAdmin.tsx'
];

function checkTags(file, tag) {
  const content = fs.readFileSync(file, 'utf8');
  const openRegex = new RegExp(`<${tag}(\\s|>|/)`, 'g');
  const closeRegex = new RegExp(`</${tag}>`, 'g');
  const selfCloseRegex = new RegExp(`<${tag}[^>]*/>`, 'g');

  const openMatches = content.match(openRegex) || [];
  const closeMatches = content.match(closeRegex) || [];
  const selfCloseMatches = content.match(selfCloseRegex) || [];

  const totalOpen = openMatches.length;
  const totalClose = closeMatches.length;
  const totalSelfClose = selfCloseMatches.length;

  if (totalOpen - totalClose - totalSelfClose !== 0) {
    console.log(`FILE: ${file} | Tag: ${tag}`);
    console.log(`  Open: ${totalOpen}`);
    console.log(`  Close: ${totalClose}`);
    console.log(`  Self-close: ${totalSelfClose}`);
    console.log(`  Balance: ${totalOpen - totalClose - totalSelfClose}`);
  }
}

const tags = [
  'div', 'Card', 'CardHeader', 'CardContent', 'CardTitle', 'CardDescription',
  'Tabs', 'TabsContent', 'TabsList', 'TabsTrigger', 'Button', 'motion.div'
];

files.forEach(file => {
  tags.forEach(tag => checkTags(file, tag));
});

console.log('Check finished.');
