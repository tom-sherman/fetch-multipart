import { multipart } from "../../src/mod.ts";

import { MultipartMessage } from "../messages.ts";

export async function parse(message: MultipartMessage): Promise<number> {
  let start = performance.now();

  let body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let chunk of message.generateChunks()) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  for await (let _ of multipart({
    body,
    headers: {
      "content-type": `multipart/form-data; boundary=${message.boundary}`,
    },
  })) {
    // Do nothing with the part, just iterate through it to measure parsing time
  }

  return performance.now() - start;
}
