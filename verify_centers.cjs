const fs = require('fs');
const csvPath = 'c:/Users/YEISON/Proyectos AI/krh-recursoshumanos/ImportarEmpPetro.csv';

// This is a placeholder for the centers we just got from the DB
const centersInDb = [
    "Aliar Santa Clara", "El Centro", "Principal", "Hidroituango", "Caño Sur", "Cantagallo",
    "Banadia", "Aliar", "Santa Rosa", "Dina", "Puerto Bahia", "Bodega Fruver", "Planta Prelistos",
    "Planta De Concentrado", "Velasquez", "Oxy La Cira", "Canacol", "Palmas", "Lote 1 Vr",
    "Samore", "Hocol-Ocelote", "Lote 5 Pk", "Campo L", "Ganaderia Las Margaritas", "Sala De Desposte",
    "Colegio Caldas", "Cpa Calle 38", "Oru", "Cpa Bmanga Km4", "Lote 4 Pk", "Clinica Bucaramanga",
    "Fundacion Cardiovascular", "Lote 4 (Lote 1 Vr)", "Lote 2 Vr", "Wfd 055", "Finca Rionegro",
    "Lote 1 (Lote 2 Vr)", "Lote Levante", "Mac Pollo", "Piscicultura", "Cpa Clinicas", "Lote 3 Vr",
    "Nexans", "Nutresa", "Caño Limon", "Caricare", "Sxq 956", "Ganaderia La Mesa", "Cenit Aseo Oru",
    "Tibu", "Casabe", "Villa Del Rosario", "Lote 5 (Lote 4 Pk)", "Cenit Aseo Samore", "Provincia",
    "Oripaya", "Toledo", "Cenit Aseo Banadia"
].map(c => c.toLowerCase());

const content = fs.readFileSync(csvPath, 'latin1');
const lines = content.split('\n');
const headers = lines[0].split(';');
const centerIdx = headers.findIndex(h => h.toLowerCase().trim().includes('centro de operaci'));

const missingCenters = new Set();

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(';');
    const center = values[centerIdx] ? values[centerIdx].trim() : '';
    if (center && !centersInDb.includes(center.toLowerCase())) {
        missingCenters.add(center);
    }
}

console.log('Missing Centers in DB:', Array.from(missingCenters));
