import { Field } from "./field.ts";
import { streamAsyncIterator } from "./util.ts";
import {
  concat as concatBytes,
  indexOfNeedle as indexOfNeedleBytes,
} from "std/bytes";

// TODO: Support other charsets
const encoder = new TextEncoder();

const BOUNDARY_EQUAL = encoder.encode("boundary=");
const RETURN_NEWLINE_2 = encoder.encode("\r\n\r\n");
const DASHSASH = encoder.encode("--");

type StreamState =
  | {
    value: "consumingStartBoundary";
    startBoudaryBytes: Uint8Array;
    stream: ReadableStream<Uint8Array>;
  }
  | {
    value: "consumingEndBoundary";
    endBoundaryBytes: Uint8Array;
    stream: ReadableStream<Uint8Array>;
  }
  | {
    value: "readingHeaderPart";
    headerBytes: Uint8Array;
    stream: ReadableStream<Uint8Array>;
  }
  | {
    value: "readingBodyPart";
    headers: Headers;
    initialBodyBytes: Uint8Array;
    stream: ReadableStream<Uint8Array>;
  };

export interface MultipartInit {
  body: ReadableStream<Uint8Array> | null;
  headers: HeadersInit;
}

export function multipart(input: MultipartInit): AsyncGenerator<Field, void> {
  const body = input.body;
  if (!body) {
    throw new Error("Failed to fetch");
  }
  const headers = new Headers(input.headers);

  const contentType = headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("multipart/")) {
    throw new Error("Failed to fetch");
  }

  const boundaryByte = getBoundary(contentType);
  if (!boundaryByte) {
    throw new Error("Failed to fetch");
  }

  const startBoundaryBytes = concatBytes(DASHSASH, boundaryByte);
  const endBoundaryBytes = concatBytes(startBoundaryBytes, DASHSASH);

  let state: StreamState = {
    value: "consumingStartBoundary",
    startBoudaryBytes: new Uint8Array(),
    stream: body,
  };

  const fieldStream = new ReadableStream({
    pull: async (controller) => {
      const reader = state.stream.getReader();
      const { done, value: chunk } = await reader.read();
      if (done) {
        controller.close();
        return;
      }

      switch (state.value) {
        case "consumingStartBoundary": {
          const newBoundaryBytes = concatBytes(state.startBoudaryBytes, chunk);
          const headersStartIndex = indexOfNeedleBytes(
            newBoundaryBytes,
            startBoundaryBytes,
          );

          if (headersStartIndex === -1) {
            state.startBoudaryBytes = newBoundaryBytes;
            return;
          }

          const headerBytes = newBoundaryBytes.slice(
            0,
            headersStartIndex + startBoundaryBytes.byteLength,
          );

          state = {
            value: "readingHeaderPart",
            headerBytes,
            stream: state.stream,
          };

          return;
        }

        case "readingHeaderPart": {
          const newHeaderBytes = concatBytes(state.headerBytes, chunk);
          const contentStartIndex = indexOfNeedleBytes(
            newHeaderBytes,
            RETURN_NEWLINE_2,
          );
          if (contentStartIndex === -1) {
            state.headerBytes = newHeaderBytes;
            return;
          }

          const headerBytes = newHeaderBytes.slice(0, contentStartIndex);
          const bodyBytes = newHeaderBytes.slice(
            contentStartIndex + RETURN_NEWLINE_2.byteLength,
          );

          state = {
            value: "readingBodyPart",
            headers: parseHeaderBytes(headerBytes),
            initialBodyBytes: bodyBytes,
            stream: state.stream,
          };
          return;
        }

        case "readingBodyPart": {
          const initialBodyBytes = state.initialBodyBytes;
          const [stream, newStream] = state.stream.tee();
          state.stream = newStream;
          const fieldBodyReader = stream.getReader();

          const endBoundaryByteLength = endBoundaryBytes.byteLength;
          // Track a window in case the boundary is split over multiple chunks
          let window = new Uint8Array(endBoundaryByteLength);
          const fieldBody = new ReadableStream<Uint8Array>({
            pull: async (controller) => {
              const { done, value: chunk } = await fieldBodyReader.read();

              if (done) {
                controller.close();
                return;
              }

              const windowPlusChunk = concatBytes(window, chunk);
              const endBoundaryIndex = indexOfNeedleBytes(
                windowPlusChunk,
                endBoundaryBytes,
              );

              if (endBoundaryIndex === -1) {
                controller.enqueue(chunk);
                window = windowPlusChunk.slice(-1 * endBoundaryByteLength);
              } else {
                const bodyBytes = chunk.slice(0, endBoundaryIndex);
                controller.enqueue(bodyBytes);
                controller.close();
              }
            },
            start: (controller) => {
              controller.enqueue(initialBodyBytes);
            },
          });

          controller.enqueue(new Field(fieldBody, { headers: state.headers }));
        }

        default: {
          throw new Error("Unexpected state");
        }
      }
    },
  });

  return streamAsyncIterator(fieldStream);
}

function getBoundary(contentType: string): Uint8Array | undefined {
  let contentTypeByte = encoder.encode(contentType);
  let boundaryIndex = indexOfNeedleBytes(contentTypeByte, BOUNDARY_EQUAL);
  if (boundaryIndex >= 0) {
    // jump over 'boundary=' to get the real boundary
    let boundary = contentTypeByte.slice(
      boundaryIndex + BOUNDARY_EQUAL.byteLength,
    );
    return boundary;
  } else {
    return undefined;
  }
}
function parseHeaderBytes(_headerBytes: Uint8Array): Headers {
  throw new Error("Function not implemented.");
}
