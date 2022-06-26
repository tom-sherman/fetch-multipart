import { Field } from "./field.ts";
import {
  collectAll,
  concatAll,
  sliceOn,
  split,
  streamAsyncIterator,
} from "./util.ts";
import {
  concat as concatBytes,
  indexOfNeedle as indexOfNeedleBytes,
} from "std/bytes";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const BOUNDARY_EQUAL = encoder.encode("boundary=");
const RETURN_NEWLINE_2 = encoder.encode("\r\n\r\n");
const RETURN_NEWLINE = encoder.encode("\r\n");
const DASHSASH = encoder.encode("--");

export interface MultipartInit {
  body: ReadableStream<Uint8Array> | null;
  headers: HeadersInit;
}

export async function* multipart(
  input: MultipartInit,
): AsyncGenerator<Field, void> {
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

  const startBoundaryBytes = concatBytes(
    DASHSASH,
    boundaryByte,
  );
  const endBoundaryBytes = concatBytes(startBoundaryBytes, DASHSASH);

  const bodyBytes = concatAll(await collectAll(streamAsyncIterator(body)));

  const parts = split(
    bodyBytes,
    concatBytes(startBoundaryBytes, RETURN_NEWLINE),
  );

  const lastPart = parts.pop();
  if (!lastPart) {
    throw new Error("Failed to fetch");
  }

  const endBoundaryIndex = indexOfNeedleBytes(
    lastPart,
    endBoundaryBytes,
  );

  if (endBoundaryIndex < 0) {
    throw new Error("Failed to fetch");
  }

  const lastPartWithoutEndBoundary = lastPart.slice(
    0,
    endBoundaryIndex,
  );

  for (const part of [...parts, lastPartWithoutEndBoundary]) {
    const [headerBytes, bodyBytes] = sliceOn(part, RETURN_NEWLINE_2);
    // Slice off the last two bytes, which are /r/n
    yield new Field(bodyBytes.slice(0, bodyBytes.byteLength - 2), {
      headers: parseHeaderBytes(headerBytes),
    });
  }
}

function getBoundary(contentType: string): Uint8Array | undefined {
  const contentTypeByte = encoder.encode(contentType);
  const boundaryIndex = indexOfNeedleBytes(contentTypeByte, BOUNDARY_EQUAL);
  if (boundaryIndex >= 0) {
    // jump over 'boundary=' to get the real boundary
    const boundary = contentTypeByte.slice(
      boundaryIndex + BOUNDARY_EQUAL.byteLength,
    );
    return boundary;
  } else {
    return undefined;
  }
}
function parseHeaderBytes(headerBytes: Uint8Array): Headers {
  const headerString = decoder.decode(headerBytes).trim();
  const headers = new Headers();
  for (const line of headerString.split("\r\n")) {
    const [name, value] = line.split(": ");
    if (!name || !value) {
      throw new Error("Failed to parse header line: " + headerString);
    }
    headers.set(name, value);
  }
  return headers;
}
