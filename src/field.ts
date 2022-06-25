import { multipart } from "./multipart.ts";
import { concat as concatBytes } from "std/bytes";

export interface FieldInit {
  headers?: HeadersInit;
}

const charsetRegex = /charset=([^()<>@,;:\"/[\]?.=\s]*)/i;

// TODO: Investigate performance of this class.
export class Field implements Body {
  public readonly headers: Headers;
  public bodyUsed = false;

  constructor(
    public body: ReadableStream<Uint8Array> | null = null,
    init?: FieldInit,
  ) {
    this.headers = new Headers(init?.headers);
  }

  public clone(): Field {
    if (!this.body) {
      return new Field(this.body, this);
    }

    if (this.bodyUsed) {
      throw new Error(
        "Failed to execute 'clone' on 'Field': Response body is already used",
      );
    }

    const [newBody, clonedBody] = this.body.tee();
    this.body = newBody;
    return new Field(clonedBody, this);
  }

  public arrayBuffer() {
    if (!this.body) {
      return Promise.resolve(new ArrayBuffer(0));
    }

    if (this.bodyUsed) {
      throw new TypeError(
        "Failed to execute 'arrayBuffer' on 'Field': body stream already read",
      );
    }

    this.bodyUsed = true;
    const reader = this.body.getReader();

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

  public async text() {
    if (this.bodyUsed) {
      throw new Error(
        "Failed to execute 'text' on 'Field': Response body is already used",
      );
    }

    const buf = await this.arrayBuffer();
    const contentType = this.headers.get("content-type");
    const charset = contentType
      ? charsetRegex.exec(contentType)?.[1]
      : undefined;
    return new TextDecoder(charset).decode(buf);
  }

  public async json() {
    if (this.bodyUsed) {
      throw new Error(
        "Failed to execute 'json' on 'Field': Response body is already used",
      );
    }

    const text = await this.text();
    return JSON.parse(text);
  }

  public async blob() {
    if (this.bodyUsed) {
      throw new Error(
        "Failed to execute 'blob' on 'Field': Response body is already used",
      );
    }

    const buf = await this.arrayBuffer();
    return new Blob([buf], {
      type: this.headers.get("content-type") ?? undefined,
    });
  }

  public async formData(): Promise<FormData> {
    // TODO: Implement
    throw new Error("Not implemented");
  }

  public multipart() {
    return multipart(this);
  }
}
