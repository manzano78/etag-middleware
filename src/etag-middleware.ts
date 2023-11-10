import { hash } from './hash.ts';

export type SupportedMimeType =
  | 'application/json'
  | 'text/html'
  | 'text/css'
  | 'text/csv'
  | 'text/plain'
  | 'text/javascript';
// Probably add more values later, on demand.

export type EtagMiddleware = (params: {
  request: Request;
  next: () => Promise<Response>;
}) => Promise<void | Response>;

export interface EtagMiddlewareOptions {
  mimeTypes: SupportedMimeType[];
}

export function etag({ mimeTypes }: EtagMiddlewareOptions): EtagMiddleware {
  // For performance reasons (billions requests can be handled!), we'll use a Set.
  const mimeTypesSet = new Set(mimeTypes);

  const isSupportedMimeType = (
    mimeType: string,
  ): mimeType is SupportedMimeType => {
    return mimeTypesSet.has(mimeType as SupportedMimeType);
  };

  const isContentTypeSupported = (
    contentTypeResponseHeader: string | null,
  ): boolean => {
    if (!contentTypeResponseHeader) {
      return false;
    }

    // The header can optionally contain the content charset as second part: "application/json; charset=utf-8"
    const [mimeType] = contentTypeResponseHeader.split(';');

    return isSupportedMimeType(mimeType);
  };

  return async ({ request, next }) => {
    if (request.method !== 'GET') {
      return;
    }

    const response = await next();
    const contentTypeResponseHeader = response.headers.get('Content-Type');

    if (!response.body || !isContentTypeSupported(contentTypeResponseHeader)) {
      return;
    }

    // As response.clone() is buggy with bun, we write a little bit more boilerplate as a workaround for now.
    // See https://github.com/oven-sh/bun/issues/6348
    const responseBodyArrayBuffer = await new Response(
      response.body,
      response,
    ).arrayBuffer();
    const responseBodyHash = hash(responseBodyArrayBuffer);
    const ifNoneMatchRequestHeader = request.headers.get('If-None-Match');

    console.log({ data: await new Response(response.body, response).text() });

    console.log({ ifNoneMatchRequestHeader, responseBodyHash });

    if (responseBodyHash === ifNoneMatchRequestHeader) {
      // The user already has the right content in its browser cache, we don't send it again.
      return new Response(null, {
        status: 304,
        headers: response.headers,
      });
    }

    // add the response body hash as etag header
    response.headers.set('ETag', responseBodyHash);
  };
}
