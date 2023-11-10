# etag-middleware

ETag header middleware based on standard [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request]) and [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response). It will be able to be used in future Remix middlewares ([RFC](https://github.com/remix-run/remix/discussions/7642)).

**Runtimes compatibility:** Node, Deno & Bun 🚀

I'll eventually support Cloudflare as well later

## Installation

```sh
# NPM
npm install @manzano/etag-middleware

# YARN
yarn add @manzano/etag-middleware
```

Requires node >= 18 or Bun

## Usage

```ts
// root.tsx (Remix route module)

import { etag } from '@manzano/etag-middleware';

export const middlewares = [
  etag({
    // mime types to process (required)
    mimetypes: ['application/json', 'text/html'],
  }),
  // ... other middlewares
];
```
