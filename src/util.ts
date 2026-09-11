export function indexOfNeedle(
  source: Uint8Array,
  needle: Uint8Array,
  start = 0,
): number {
  if (needle.length === 0) {
    return start <= source.length ? start : -1;
  }
  const first = needle[0]!;
  const last = source.length - needle.length;
  outer: for (let i = start; i <= last; i++) {
    if (source[i] !== first) continue;
    for (let j = 1; j < needle.length; j++) {
      if (source[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

export function concat(...buf: Uint8Array[]): Uint8Array {
  return concatAll(buf);
}

export async function* streamAsyncIterator<T>(
  stream: ReadableStream<T>,
): AsyncGenerator<T, void> {
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        return;
      }

      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

export function concatAll(buf: Uint8Array[]) {
  let length = 0;
  for (const b of buf) {
    length += b.length;
  }

  const output = new Uint8Array(length);
  let index = 0;
  for (const b of buf) {
    output.set(b, index);
    index += b.length;
  }

  return output;
}

export function sliceOn(
  bytes: Uint8Array,
  needle: Uint8Array,
): [Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>] {
  const index = indexOfNeedle(bytes, needle);
  if (index === -1) {
    return [bytes.slice(), new Uint8Array()];
  }

  return [bytes.slice(0, index), bytes.slice(index + needle.byteLength)];
}

export async function collectAll<T>(iterator: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const value of iterator) {
    result.push(value);
  }
  return result;
}

export function startsWith(bytes: Uint8Array, prefix: Uint8Array): boolean {
  if (prefix.length > bytes.length) {
    return false;
  }
  for (let i = 0; i < prefix.length; i++) {
    if (bytes[i] !== prefix[i]) {
      return false;
    }
  }
  return true;
}
