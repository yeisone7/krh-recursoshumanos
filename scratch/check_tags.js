
import fs from 'fs';

const content = fs.readFileSync('c:/Users/YEISON/Proyectos AI/krh-recursoshumanos/src/pages/Requisiciones.tsx', 'utf8');

let openDivs = 0;
let closeDivs = 0;
let openFragments = 0;
let closeFragments = 0;

const divOpenRegex = /<div\b/g;
const divCloseRegex = /<\/div>/g;
const fragmentOpenRegex = /<>/g;
const fragmentCloseRegex = /<\/>/g;

openDivs = (content.match(divOpenRegex) || []).length;
closeDivs = (content.match(divCloseRegex) || []).length;
openFragments = (content.match(fragmentOpenRegex) || []).length;
closeFragments = (content.match(fragmentCloseRegex) || []).length;

console.log(`Divs: Open ${openDivs}, Close ${closeDivs}`);
console.log(`Fragments: Open ${openFragments}, Close ${closeFragments}`);
