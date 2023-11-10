import { createHash } from 'node:crypto';

const supportedMimeTypes = [
  'application/json',
  'text/html',
  'text/css',
  'text/csv',
  'text/plain',
  'text/javascript'
  // Probably add more values later, on demand.
] as const satisfies ReadonlyArray<string>;

// For performance considerations (billions requests can be handled!), we'll use a Set.
const supportedMimeTypesSet = new Set(supportedMimeTypes);

type SupportedMimeType = typeof supportedMimeTypes[number];
export type EtagMiddleware = (params: { request: Request; next: () => Promise<Response> }) => Promise<void | Response>;
export interface EtagMiddlewareOptions {
  mimeTypes: SupportedMimeType[]
}

function isSupportedMimeType(mimeType: string): mimeType is SupportedMimeType {
  return supportedMimeTypesSet.has(mimeType as SupportedMimeType);
}

function isContentTypeSupported(contentTypeResponseHeader: string | null): boolean {
  if (!contentTypeResponseHeader) {
    return false;
  }

  // The header can optionally contain the content encoding as second part: "application/json; charset=utf-8"
  const [mimeType] = contentTypeResponseHeader.split(';');

  return isSupportedMimeType(mimeType);
}

function hashArrayBuffer(arrayBuffer: ArrayBuffer): string {
  const buffer = Buffer.from(arrayBuffer);
  const hash = createHash('sha256');

  hash.update(buffer);

  return hash.digest('hex');
}

export function etag({ mimeTypes }: EtagMiddlewareOptions): EtagMiddleware {
  return async ({ request, next }) => {
    if (request.method !== 'GET') {
      return;
    }

    const response = await next();
    const contentTypeResponseHeader = response.headers.get('Content-Type');

    if (!response.body || !isContentTypeSupported(contentTypeResponseHeader)) {
      return;
    }

    const responseBodyArrayBuffer = await response.clone().arrayBuffer();
    const responseBodyHash = hashArrayBuffer(responseBodyArrayBuffer);
    const ifNoneMatchRequestHeader = request.headers.get('If-None-Match');

    if (responseBodyHash === ifNoneMatchRequestHeader) {
      // The user already has the right content in its browser cache, we don't send it again.
      return new Response(null, {
        status: 304,
        headers: response.headers,
      });
    }

    // add the response body hash as etag header
    response.headers.set('ETag', responseBodyHash);
  }
}
