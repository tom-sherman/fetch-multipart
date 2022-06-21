import { Field } from "./field.js";
import { indexOfNeedleBytes } from "./util.js";

const encoder = new TextEncoder();

const BOUNDARY_EQUAL = encoder.encode("boundary=");

interface MultipartInit {
  body: ReadableStream<Uint8Array> | null;
  headers: Headers;
}

export async function* multipart(
  input: MultipartInit
): AsyncGenerator<Field, void, Field> {
  const body = input.body;
  if (!body) {
    throw new Error("Failed to fetch");
  }

  const contentType = input.headers.get("content-type");
  if (!contentType?.startsWith("multipart/form-data")) {
    throw new Error("Failed to fetch");
  }

  const boundaryByte = getBoundary(contentType);
  if (!boundaryByte) {
    throw new Error("Failed to fetch");
  }

  const stream = new TransformStream<Uint8Array, Field>({
    transform: (chunk, controller) => {},
  });
  body.pipeTo(stream.writable);

  // TODO: Draw the rest of the owl
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
