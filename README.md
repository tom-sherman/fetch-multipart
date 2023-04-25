# fetch-multipart

> **This library is very WIP. It doesn't quite work yet...**

Standards-inspired `multipart/*` parsing. It's like `response.text()` but for multipart bodies!

## Goals

- 100% standards compliant and isomorphic. Use it in the browser, Cloudflare Workers, Deno, and whatever new JS environment was created last week
- Support all multipart bodies: `multipart/form-data`, `multipart/mixed`, `multipart/digest`, and `multipart/parallel`
- Support nested multipart bodies

## API

### `multipart(input: MultipartInput): AsyncGenerator<BodyPart>>`

Pass a `Request` or `Response` and receive an async iterator of `BodyPart`s.

### `MultipartInput`

A `Request`/`Response`-like object.

Needs to have a `body` that is a `ReadableStream<Uint8Array> | null` and a `headers` of type `Headers`.

### `BodyPart`

Conceptually multipart bodies are comprised of one or more "body parts". Each body part comprises a single part of the multipart body.

`BodyPart` shares many properties and methods with `Response` eg. `.json()`, `.text()`, `.blob()`. You can also access the underlying stream via `.body` just as you would do with a `Response`.

You can also handle nested multipart bodies by calling the `.multipart()` method.

## Usage

```js
import { multipart } from "fetch-multipart";

const parts = await fetch('/api').then(multipart);

for await (const bodyPart of parts) {
  bodyPart.headers.get("content-disposition"); // read the headers for this part
  await bodyPart.arrayBuffer(); // Read the body part's body in an ArrayBuffer
  await bodyPart.json(); // Read the body part's body as JSON
  await streamUpload(bodyPart.body); // Access the body stream directly. eg. to stream to storage
}
```

## Prior art

- https://github.com/mscdex/busboy
- https://github.com/deligenius/multiparser
- https://github.com/maraisr/meros
