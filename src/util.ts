import { indexOfNeedle as indexOfNeedleBytes } from "std/bytes";

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
): [Uint8Array, Uint8Array] {
  const index = indexOfNeedleBytes(bytes, needle);
  if (index === -1) {
    return [bytes, new Uint8Array()];
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

export function split(bytes: Uint8Array, needle: Uint8Array): Uint8Array[] {
  const result: Uint8Array[] = [];
  let index = 0;
  while (true) {
    const [slice, rest] = sliceOn(bytes.slice(index), needle);
    if (slice.length > 0) {
      result.push(slice);
    }
    if (rest.length === 0) {
      break;
    }
    index += slice.length + needle.length;
  }

  return result;
}
