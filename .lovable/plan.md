

## Plan: Exportar Contrato de Plantilla DOCX como PDF

### Problema
Actualmente el contrato se genera desde una plantilla DOCX y se descarga como `.docx`. El usuario quiere que se exporte como PDF manteniendo el mismo contenido de la plantilla.

### Enfoque
Crear un **edge function** que reciba el DOCX generado, lo convierta a PDF usando **LibreOffice** (disponible en el entorno Deno/Docker de las edge functions), y devuelva el PDF.

**Flujo:**
1. El cliente genera el DOCX desde la plantilla (lógica existente con docxtemplater)
2. Envía el DOCX como base64 a la edge function `convert-docx-to-pdf`
3. La edge function usa LibreOffice headless para convertir DOCX → PDF
4. Retorna el PDF como base64
5. El cliente descarga el PDF

### Cambios

**1. Nueva Edge Function `convert-docx-to-pdf`**
- Recibe `{ docxBase64: string, filename: string }`
- Escribe el DOCX a un archivo temporal
- Ejecuta `libreoffice --headless --convert-to pdf`
- Lee el PDF resultante y lo retorna como base64
- Limpia archivos temporales

**2. `src/lib/contractDocumentGenerator.ts`**
- Agregar función `convertDocxToPdf(docxBlob: Blob): Promise<Blob>` que llama a la edge function

**3. `src/components/contracts/GenerateContractDialog.tsx`**
- Reemplazar botón "Generar Word" por "Generar PDF" 
- Eliminar botón "Generar PDF Básico"
- Modificar `handleGenerateWord` → `handleGeneratePDF`: genera DOCX desde plantilla, luego lo convierte a PDF via la edge function, y descarga el PDF
- Mantener la opción de "Generar PDF Básico" solo cuando NO hay plantilla configurada

**4. `supabase/config.toml`**
- Agregar configuración para la nueva edge function con `verify_jwt = false`

### UI Resultado
- Si hay plantilla: solo botón **"Generar PDF"** (genera desde plantilla DOCX → convierte a PDF)
- Si NO hay plantilla: solo botón **"Generar PDF Básico"** (el fallback actual con jsPDF)

### Archivos

| Archivo | Acción |
|---|---|
| `supabase/functions/convert-docx-to-pdf/index.ts` | Nuevo — edge function de conversión |
| `src/lib/contractDocumentGenerator.ts` | Agregar `convertDocxToPdf()` |
| `src/components/contracts/GenerateContractDialog.tsx` | Reemplazar botones, nuevo flujo |
| `supabase/config.toml` | Agregar config de la nueva función |

### Nota técnica
Si LibreOffice no está disponible en el entorno de edge functions (Deno Deploy), usaremos una alternativa: la librería `mammoth.js` para convertir DOCX a HTML en el cliente, y luego renderizar ese HTML a PDF con `html2pdf.js` o `jsPDF`. Esta alternativa es menos fiel al formato original pero funciona 100% client-side.

