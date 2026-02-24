import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return new Response(
        JSON.stringify({ error: "Only PDF files are supported" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Extract text from PDF by parsing the raw bytes
    // We look for text between BT (Begin Text) and ET (End Text) markers
    // and also extract text from parentheses (Tj operator) and angle brackets
    const textContent = extractTextFromPdfBytes(bytes);

    return new Response(
      JSON.stringify({ 
        text: textContent,
        fileName: file.name,
        fileSize: file.size 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("extract-pdf error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to extract PDF text" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractTextFromPdfBytes(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  const texts: string[] = [];

  // Extract text from Tj and TJ operators (text showing operators)
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let match: RegExpExecArray | null;
  while ((match = tjRegex.exec(raw)) !== null) {
    const decoded = decodePdfString(match[1]);
    if (decoded.trim()) texts.push(decoded);
  }

  // Extract from TJ arrays: [(text) num (text) ...] TJ
  const tjArrayRegex = /\[((?:\([^)]*\)|[^[\]])*)\]\s*TJ/gi;
  while ((match = tjArrayRegex.exec(raw)) !== null) {
    const inner = match[1];
    const parts: string[] = [];
    const partRegex = /\(([^)]*)\)/g;
    let partMatch: RegExpExecArray | null;
    while ((partMatch = partRegex.exec(inner)) !== null) {
      parts.push(decodePdfString(partMatch[1]));
    }
    const line = parts.join("");
    if (line.trim()) texts.push(line);
  }

  // If no text found via operators, try a simpler stream-based extraction
  if (texts.length === 0) {
    const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
    while ((match = streamRegex.exec(raw)) !== null) {
      const content = match[1];
      // Extract readable ASCII sequences
      const readable = content.replace(/[^\x20-\x7E\n\r]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (readable.length > 10) texts.push(readable);
    }
  }

  return texts.join("\n").trim() || "No se pudo extraer texto del PDF. El archivo puede contener solo imágenes.";
}

function decodePdfString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\")
    .replace(/\\([()])/g, "$1")
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}
