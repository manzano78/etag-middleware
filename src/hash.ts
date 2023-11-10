import Crypto from 'node:crypto';

export function hash(arrayBuffer: ArrayBuffer): string {
  const buffer = Buffer.from(arrayBuffer);
  const hash = Crypto.createHash('sha256');

  hash.update(buffer);

  return hash.digest('hex');
}
