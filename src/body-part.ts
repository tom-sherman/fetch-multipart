import { multipart } from "./multipart.ts";
import { concat as concatBytes } from "std/bytes";

export interface BodyPartInit {
  headers?: HeadersInit;
}

const charsetRegex = /charset=([^()<>@,;:\"/[\]?.=\s]*)/i;

// TODO: Investigate performance of this class.
export class BodyPart implements Body {
  #headers: Headers;
  #bodyUsed = false;
  #body: ReadableStream<Uint8Array> | null;

  constructor(
    body: BodyInit | null = null,
    init?: BodyPartInit,
  ) {
    this.#headers = new Headers(init?.headers);
    this.#body = !body ? null : new Response(body).body;
  }

  get body(): ReadableStream<Uint8Array> | null {
    return this.#body;
  }
  get headers(): Headers {
    return this.#headers;
  }
  get bodyUsed(): boolean {
    return this.#bodyUsed;
  }

  clone(): BodyPart {
    if (!this.#body) {
      return new BodyPart(this.#body, this);
    }

    if (this.#bodyUsed) {
      throw new Error(
        "Failed to execute 'clone' on 'BodyPart': Response body is already used",
      );
    }

    const [newBody, clonedBody] = this.#body.tee();
    this.#body = newBody;
    return new BodyPart(clonedBody, this);
  }

  arrayBuffer() {
    if (!this.#body) {
      return Promise.resolve(new ArrayBuffer(0));
    }

    if (this.#bodyUsed) {
      throw new TypeError(
        "Failed to execute 'arrayBuffer' on 'BodyPart': body stream already read",
      );
    }

    this.#bodyUsed = true;
    const reader = this.#body.getReader();

    return Promise.resolve().then(async () => {
      let arr: Uint8Array = new Uint8Array();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        arr = concatBytes(arr, value);
      }

      const buf = new ArrayBuffer(arr.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < arr.length; i++) {
        view[i]! = arr[i]!;
      }

      return buf;
    });
  }

  async text() {
    if (this.#bodyUsed) {
      throw new Error(
        "Failed to execute 'text' on 'BodyPart': Response body is already used",
      );
    }

    const buf = await this.arrayBuffer();
    const contentType = this.headers.get("content-type");
    const charset = contentType
      ? charsetRegex.exec(contentType)?.[1]
      : undefined;
    return new TextDecoder(charset).decode(buf);
  }

  async json() {
    if (this.#bodyUsed) {
      throw new Error(
        "Failed to execute 'json' on 'BodyPart': Response body is already used",
      );
    }

    const text = await this.text();
    return JSON.parse(text);
  }

  async blob() {
    if (this.#bodyUsed) {
      throw new Error(
        "Failed to execute 'blob' on 'BodyPart': Response body is already used",
      );
    }

    const buf = await this.arrayBuffer();
    return new Blob([buf], {
      type: this.headers.get("content-type") ?? undefined,
    });
  }

  // deno-lint-ignore require-await
  async formData(): Promise<FormData> {
    // TODO: Implement
    throw new Error("Not implemented");
  }

  multipart() {
    return multipart(this);
  }
}
