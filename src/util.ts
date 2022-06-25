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
