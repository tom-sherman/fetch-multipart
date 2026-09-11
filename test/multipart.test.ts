import { multipart } from "../src/mod.ts";
import { test } from "node:test";
import assert from "node:assert/strict";

async function collectAll<T>(iterator: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const value of iterator) {
    result.push(value);
  }
  return result;
}

test("can get bodypart bodies with response and simple formdata", async () => {
  const fd = new FormData();
  fd.set("foo", "bar");
  fd.set("baz", "baz");
  const response = new Response(fd);
  const parts = await collectAll(multipart(response));

  assert.equal(parts.length, 2);
  assert.equal(await parts[0]!.text(), "bar");
  assert.equal(await parts[1]!.text(), "baz");
});

test("can get bodypart headers with response and simple formdata", async () => {
  const fd = new FormData();
  fd.set("foo", "bar");
  fd.set("baz", "baz");
  const response = new Response(fd);
  const parts = await collectAll(multipart(response));

  assert.equal(parts.length, 2);
  assert.equal(
    parts[0]!.headers.get("content-disposition"),
    'form-data; name="foo"',
  );
  assert.equal(
    parts[1]!.headers.get("content-disposition"),
    'form-data; name="baz"',
  );
});
