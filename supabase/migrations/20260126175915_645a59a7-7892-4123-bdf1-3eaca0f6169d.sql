-- Update the documents bucket to allow DOCX, DOC, and PDF files
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-word',
  'application/octet-stream'
]
WHERE id = 'documents';