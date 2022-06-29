# response-multipart

> **This library is very WIP. It doesn't quite work yet...**

Standards-inspired `multipart/*` parsing. It's like `response.text()` but for multipart bodies!

## Goals

- 100% standards compliant and isomorphic. Use it in the browser, Cloudflare Workers, Deno, and whatever new JS environment was created last week
- Support all multipart bodies: `multipart/form-data`, `multipart/mixed`, `multipart/digest`, and `multipart/parallel`
- Support nested multipart bodies

## API

### `multipart(input: MultipartInput): AsyncGenerator<Field>>`

Pass a `Request` or `Response` and receive an async iterator of `Field`s.

### `MultipartInput`

A `Request`/`Response`-like object.

Needs to have a `body` that is a `ReadableStream<Uint8Array> | null` and a `headers` of type `Headers`.

### `Field`

Conceptually multipart bodies are comprised of one or more "fields". Each field comprises a single part of the multipart body.

`Field` shares many properties and methods with `Response` eg. `.json()`, `.text()`, `.blob()`. You can also access the underlying stream via `.body` just as you would do with a `Response`.

You can also handle nested multipart bodies by calling the `.multipart()` method.

## Usage

```js
import { multipart } from "response-multipart";

const fields = await fetch('/api').then(multipart);

for await (const field of fields) {
  field.headers.get("content-disposition"); // read the headers for this part
  await field.arrayBuffer(); // Read the field's body in an ArrayBuffer
  await field.json(); // Read the field's body as JSON
  await streamUpload(field.body); // Access the body stream directly. eg. to stream to storage
}
```

## Prior art

- https://github.com/mscdex/busboy
- https://github.com/deligenius/multiparser
- https://github.com/maraisr/meros
