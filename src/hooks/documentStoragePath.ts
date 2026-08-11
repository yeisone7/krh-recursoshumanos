interface BuildDocumentStoragePathParams {
  companyId: string;
  entityType: string;
  entityId: string;
  version: number;
  fileName: string;
  uploadId?: string;
}

export function buildDocumentStoragePath({
  companyId,
  entityType,
  entityId,
  version,
  fileName,
  uploadId = crypto.randomUUID(),
}: BuildDocumentStoragePathParams) {
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

  return `${companyId}/${entityType}/${entityId}/v${version}_${uploadId}_${sanitizedFileName}`;
}
