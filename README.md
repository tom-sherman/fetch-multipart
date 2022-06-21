# response-multipart

> **This libary is very WIP. It doesn't quite work yet...**

Standards-inspired `multipart/*` parsing. It's like `response.text()` but for multipart bodies!

## API

### `multipart(input: MultipartInput): AsyncGenerator<Field>>`

Pass a `Request` or `Response` and receive an async iterator of `Field`s.

### `MultipartInput`

A `Request`/`Response`-like object.

Needs to have a `body` that is a `ReadableStream<Uint8Array> | null` and a `headers` of type `Headers`.

### `Field`

Conceptually multipart bodies are comprised of one or more "fields". Each field comprises a single part of the multipart body.

`Field` shares many properties and methods with `Response` eg. `.json()`, `.text()`, `.blob()`. You can also access the underlying stream via `.body` just as you would do with a `Response`.

## Usage

Here's an example use case with the Service Workers API (eg. Cloudflare Workers):

```js
import { multipart } from "response-multipart";
import { uploadImageToStorage } from "my-storage-provider";

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  for await (const field of multipart(request)) {
    const name = headerValue(field.headers.get("Content-Disposition"), "name");
    await uploadImageToStorage(name, field.body);
  }

  return new Response("OK")
}

// Extract a value from a string like "foo=bar; baz=buz"
function headerValue(header, valueKey) {
  const entries = header.split(";");

  for (const entry of entries) {
    const [key, value] = entry.trim().split("=");

    if (value && valueKey == key) {
      return value;
    }
  }
}
```
