const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const maxPdfSize = 10 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await readPdfPayload(req);

    if (!payload) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payload.fileName.toLowerCase().endsWith(".pdf")) {
      return new Response(
        JSON.stringify({ error: "Only PDF files are supported" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payload.fileSize > maxPdfSize) {
      return new Response(
        JSON.stringify({ error: "PDF file exceeds 10MB" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract text from PDF by parsing the raw bytes
    // We look for text between BT (Begin Text) and ET (End Text) markers
    // and also extract text from parentheses (Tj operator) and angle brackets
    const textContent = extractTextFromPdfBytes(payload.bytes);

    return new Response(
      JSON.stringify({ 
        text: textContent,
        fileName: payload.fileName,
        fileSize: payload.fileSize
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

async function readPdfPayload(req: Request): Promise<{ fileName: string; fileSize: number; bytes: Uint8Array } | null> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return null;
    }
    const fileName = typeof body?.fileName === "string" ? body.fileName : "";
    const fileBase64 = typeof body?.fileBase64 === "string" ? body.fileBase64 : "";
    const fileSize = typeof body?.fileSize === "number" ? body.fileSize : 0;

    if (!fileName || !fileBase64) return null;
    if (fileSize > maxPdfSize) {
      return { fileName, fileSize, bytes: new Uint8Array() };
    }

    const binary = atob(fileBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return { fileName, fileSize: fileSize || bytes.byteLength, bytes };
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return null;

  if (file.size > maxPdfSize) {
    return { fileName: file.name, fileSize: file.size, bytes: new Uint8Array() };
  }

  return {
    fileName: file.name,
    fileSize: file.size,
    bytes: new Uint8Array(await file.arrayBuffer()),
  };
}

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
