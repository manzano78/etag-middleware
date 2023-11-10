import { describe, expect, it } from 'bun:test';
import { etag } from '../src/etag-middleware.ts';
import { hash } from '../src/hash.ts';

describe('Etag header middleware', () => {
  const testUrl = 'https:/test.com/test';
  const etagMiddleware = etag({
    mimeTypes: ['text/plain'],
  });

  it('should not etag because the method of the request is not "GET"', async () => {
    const request = new Request(testUrl, { method: 'POST' });
    const baseResponse = new Response('Hello world!', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      }
    });
    const next = async () => baseResponse;
    const newResponse = await etagMiddleware({ request, next });

    expect(newResponse).toBeUndefined();
    expect(baseResponse.headers.get('ETag')).toBeNull();
  });

  it('should not etag because the content type of the response is not included', async () => {
    const request = new Request(testUrl);
    const baseResponse = new Response('.red{color: red;}', {
      status: 200,
      headers: {
        'Content-Type': 'text/css',
      }
    });
    const next = async () => baseResponse;
    const newResponse = await etagMiddleware({ request, next });

    expect(newResponse).toBeUndefined();
    expect(baseResponse.headers.get('ETag')).toBeNull();
  });

  it('should add an etag header in the response at first hit', async () => {
    const data = 'Hello world!';
    const dataBufferArray = new TextEncoder().encode(data);
    const dataHash = hash(dataBufferArray.buffer as ArrayBuffer);
    const request = new Request(testUrl);
    const baseResponse = new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      }
    });
    const next = async () => baseResponse;
    const newResponse = await etagMiddleware({ request, next });

    expect(newResponse).toBeUndefined();
    expect(baseResponse.headers.get('ETag')).toBe(dataHash);
  });

  it('should return a 304 Not-Modified response as the data did not change', async () => {
    const data = 'Hello world!';
    const dataBufferArray = new TextEncoder().encode(data);
    const dataHash = hash(dataBufferArray.buffer as ArrayBuffer);
    const request = new Request(testUrl, {
      headers: {
        'If-None-Match': dataHash,
      }
    });
    const baseResponse = new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      }
    });
    const next = async () => baseResponse;
    const newResponse = await etagMiddleware({ request, next });

    expect(newResponse?.status).toBe(304);
  });
});
