export function concatBytes(a: Uint8Array, b: Uint8Array) {
  const c = new Uint8Array(a.length + b.length);
  c.set(a);
  c.set(b, a.length);
  return c;
}

/**
 * From https://github.com/denoland/deno_std/blob/1db39c063a23b1ff115a16cd35b055be57d938af/bytes/mod.ts#L27-L56
 */
export function indexOfNeedleBytes(
  source: Uint8Array,
  pattern: Uint8Array,
  fromIndex = 0
): number {
  if (fromIndex >= source.length) {
    return -1;
  }
  if (fromIndex < 0) {
    fromIndex = Math.max(0, source.length + fromIndex);
  }
  const s = pattern[0];
  for (let i = fromIndex; i < source.length; i++) {
    if (source[i] !== s) continue;
    const pin = i;
    let matched = 1;
    let j = i;
    while (matched < pattern.length) {
      j++;
      if (source[j] !== pattern[j - pin]) {
        break;
      }
      matched++;
    }
    if (matched === pattern.length) {
      return pin;
    }
  }
  return -1;
}

function startsWith(source: Uint8Array, prefix: Uint8Array): boolean {
  if (source.byteLength < prefix.byteLength) {
    return false;
  }
  for (let i = 0; i < prefix.byteLength; i++) {
    if (source[i] !== prefix[i]) {
      return false;
    }
  }
  return true;
}
