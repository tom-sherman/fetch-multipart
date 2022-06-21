import { Field } from "./field.js";
import {
  concatBytes,
  indexOfNeedleBytes,
  streamAsyncIterator,
} from "./util.js";

// TODO: Support other charsets
const encoder = new TextEncoder();

const BOUNDARY_EQUAL = encoder.encode("boundary=");
const RETURN_NEWLINE_2 = encoder.encode("\r\n\r\n");
const DASHSASH = encoder.encode("--");

type StreamState =
  | {
      value: "consumingStartBoundary";
      startBoudaryBytes: Uint8Array;
    }
  | {
      value: "consumingEndBoundary";
      endBoundaryBytes: Uint8Array;
    }
  | {
      value: "readingHeaderPart";
      headerBytes: Uint8Array;
    }
  | {
      value: "readingBodyPart";
      headers: Headers;
      initialBodyBytes: Uint8Array;
    };

export interface MultipartInit {
  body: ReadableStream<Uint8Array> | null;
  headers: Headers;
}

export function multipart(input: MultipartInit): AsyncIterator<Field> {
  const body = input.body;
  if (!body) {
    throw new Error("Failed to fetch");
  }

  const contentType = input.headers.get("content-type");
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
  };

  const stream = new TransformStream<Uint8Array, Field>({
    transform: (chunk, controller) => {
      switch (state.value) {
        case "consumingStartBoundary": {
          const newBoundaryBytes = concatBytes(state.startBoudaryBytes, chunk);
          const headersStartIndex = indexOfNeedleBytes(
            newBoundaryBytes,
            startBoundaryBytes
          );

          if (headersStartIndex === -1) {
            state.startBoudaryBytes = newBoundaryBytes;
            return;
          }

          const headerBytes = newBoundaryBytes.slice(
            0,
            headersStartIndex + startBoundaryBytes.byteLength
          );

          state = {
            value: "readingHeaderPart",
            headerBytes,
          };

          return;
        }

        case "readingHeaderPart": {
          const newHeaderBytes = concatBytes(state.headerBytes, chunk);
          const contentStartIndex = indexOfNeedleBytes(
            newHeaderBytes,
            RETURN_NEWLINE_2
          );
          if (contentStartIndex === -1) {
            state.headerBytes = newHeaderBytes;
            return;
          }

          const headerBytes = newHeaderBytes.slice(0, contentStartIndex);
          const bodyBytes = newHeaderBytes.slice(
            contentStartIndex + RETURN_NEWLINE_2.byteLength
          );

          state = {
            value: "readingBodyPart",
            headers: parseHeaderBytes(headerBytes),
            initialBodyBytes: bodyBytes,
          };
          return;
        }

        case "readingBodyPart": {
          // Tee the current stream to a and b
          // Transform a so that it closes on endboundary
          // let a be the Field body
          // yield Field using state.headers
          // let b be the rest of the stream
        }

        default: {
          throw new Error("Unexpected state");
        }
      }
    },
  });

  body.pipeTo(stream.writable);

  return streamAsyncIterator(stream.readable);
}

function getBoundary(contentType: string): Uint8Array | undefined {
  let contentTypeByte = encoder.encode(contentType);
  let boundaryIndex = indexOfNeedleBytes(contentTypeByte, BOUNDARY_EQUAL);
  if (boundaryIndex >= 0) {
    // jump over 'boundary=' to get the real boundary
    let boundary = contentTypeByte.slice(
      boundaryIndex + BOUNDARY_EQUAL.byteLength
    );
    return boundary;
  } else {
    return undefined;
  }
}
function parseHeaderBytes(headerBytes: Uint8Array): Headers {
  throw new Error("Function not implemented.");
}
