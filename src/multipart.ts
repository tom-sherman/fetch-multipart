import { BodyPart } from "./body-part.ts";
import {
  collectAll,
  concat as concatBytes,
  concatAll,
  indexOfNeedle as indexOfNeedleBytes,
  sliceOn,
  startsWith,
  streamAsyncIterator,
} from "./util.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const RETURN_NEWLINE_2 = encoder.encode("\r\n\r\n");
const RETURN_NEWLINE = encoder.encode("\r\n");
const DASHSASH = encoder.encode("--");

const CR = 0x0d;
const LF = 0x0a;
const DASH = 0x2d;
const SPACE = 0x20;
const TAB = 0x09;

export interface MultipartInit {
  body: ReadableStream<Uint8Array> | null;
  headers: HeadersInit;
}

// Parses a multipart body according to the grammar in RFC 2046 section 5.1.1:
//
//   multipart-body := [preamble CRLF]
//                     dash-boundary transport-padding CRLF
//                     body-part *encapsulation
//                     close-delimiter transport-padding
//                     [CRLF epilogue]
//
//   encapsulation := delimiter transport-padding CRLF body-part
//   delimiter := CRLF dash-boundary
//   close-delimiter := delimiter "--"
//
// Note that the CRLF preceding each dash-boundary is part of the delimiter and
// not part of the preceding body-part.
export async function* multipart(
  input: MultipartInit,
): AsyncGenerator<BodyPart, void> {
  const body = input.body;
  if (!body) {
    throw new Error("Failed to fetch");
  }
  const headers = new Headers(input.headers);

  const contentType = headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("multipart/")) {
    throw new Error("Failed to fetch");
  }

  const boundary = getBoundary(contentType);
  if (!boundary) {
    throw new Error("Failed to fetch");
  }

  const dashBoundary = concatBytes(DASHSASH, encoder.encode(boundary));
  const delimiter = concatBytes(RETURN_NEWLINE, dashBoundary);

  const bodyBytes = concatAll(await collectAll(streamAsyncIterator(body)));

  // Skip the preamble. The first dash-boundary is either at the very start of
  // the body (no preamble) or is preceded by a CRLF (i.e. it's a delimiter).
  let position: number;
  if (
    startsWith(bodyBytes, dashBoundary) &&
    isDelimiterEnd(bodyBytes, dashBoundary.byteLength)
  ) {
    position = dashBoundary.byteLength;
  } else {
    const index = indexOfDelimiter(bodyBytes, delimiter, 0);
    if (index < 0) {
      throw new Error("Failed to fetch");
    }
    position = index + delimiter.byteLength;
  }

  while (true) {
    // `position` is immediately after a dash-boundary that is known to be
    // followed by either "--" or transport-padding CRLF.
    if (bodyBytes[position] === DASH && bodyBytes[position + 1] === DASH) {
      // Close delimiter. Anything that follows is the epilogue, which is
      // ignored.
      return;
    }

    // transport-padding := *LWSP-char
    while (bodyBytes[position] === SPACE || bodyBytes[position] === TAB) {
      position++;
    }
    // CRLF
    position += 2;

    const nextDelimiterIndex = indexOfDelimiter(bodyBytes, delimiter, position);
    if (nextDelimiterIndex < 0) {
      // Every body-part must be followed by a delimiter, and the final one
      // must be followed by the close delimiter.
      throw new Error("Failed to fetch");
    }

    yield parseBodyPart(bodyBytes.slice(position, nextDelimiterIndex));

    position = nextDelimiterIndex + delimiter.byteLength;
  }
}

// Finds the first delimiter at or after `from`. A `CRLF--boundary` is only a
// delimiter when it's followed by "--" (close-delimiter) or transport-padding
// CRLF; one followed by anything else is part data and the search continues
// past it. The boundary cannot contain CR or LF, so a real delimiter can never
// overlap a near-miss.
function indexOfDelimiter(
  bytes: Uint8Array,
  delimiter: Uint8Array,
  from: number,
): number {
  let index = indexOfNeedleBytes(bytes, delimiter, from);
  while (index >= 0 && !isDelimiterEnd(bytes, index + delimiter.byteLength)) {
    index = indexOfNeedleBytes(bytes, delimiter, index + delimiter.byteLength);
  }
  return index;
}

// Whether the bytes at `position` (immediately after a dash-boundary) are what
// may follow one: "--" or transport-padding CRLF.
function isDelimiterEnd(bytes: Uint8Array, position: number): boolean {
  if (bytes[position] === DASH && bytes[position + 1] === DASH) {
    return true;
  }
  while (bytes[position] === SPACE || bytes[position] === TAB) {
    position++;
  }
  return bytes[position] === CR && bytes[position + 1] === LF;
}

// body-part := MIME-part-headers [CRLF *OCTET]
function parseBodyPart(part: Uint8Array<ArrayBuffer>): BodyPart {
  // No headers: the part begins with the CRLF that separates (absent) headers
  // from the body.
  if (startsWith(part, RETURN_NEWLINE)) {
    return new BodyPart(part.slice(RETURN_NEWLINE.byteLength));
  }

  const [headerBytes, bodyBytes] = sliceOn(part, RETURN_NEWLINE_2);
  return new BodyPart(bodyBytes, {
    headers: parseHeaderBytes(headerBytes),
  });
}

const boundaryRegex = /;\s*boundary=(?:"([^"]*)"|([^;\s]*))/i;

function getBoundary(contentType: string): string | undefined {
  const match = boundaryRegex.exec(contentType);
  if (!match) {
    return undefined;
  }
  return match[1] ?? match[2];
}

function parseHeaderBytes(headerBytes: Uint8Array): Headers {
  const headerString = decoder.decode(headerBytes).trim();
  const headers = new Headers();
  if (headerString === "") {
    return headers;
  }
  for (const line of headerString.split("\r\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) {
      throw new Error("Failed to parse header line: " + headerString);
    }
    const name = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!name) {
      throw new Error("Failed to parse header line: " + headerString);
    }
    headers.set(name, value);
  }
  return headers;
}
