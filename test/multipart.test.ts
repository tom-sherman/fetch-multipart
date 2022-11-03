import { multipart } from "../src/mod.ts";
import { assertEquals } from "std/testing/asserts";

async function collectAll<T>(iterator: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const value of iterator) {
    result.push(value);
  }
  return result;
}

Deno.test("can get bodypart bodies with response and simple formdata", async () => {
  const fd = new FormData();
  fd.set("foo", "bar");
  fd.set("baz", "baz");
  const response = new Response(fd);
  const parts = await collectAll(multipart(response));

  assertEquals(parts.length, 2);
  assertEquals(await parts[0]!.text(), "bar");
  assertEquals(await parts[1]!.text(), "baz");
});

Deno.test("can get bodypart headers with response and simple formdata", async () => {
  const fd = new FormData();
  fd.set("foo", "bar");
  fd.set("baz", "baz");
  const response = new Response(fd);
  const parts = await collectAll(multipart(response));

  assertEquals(parts.length, 2);
  assertEquals(
    parts[0]!.headers.get("content-disposition"),
    'form-data; name="foo"',
  );
  assertEquals(
    parts[1]!.headers.get("content-disposition"),
    'form-data; name="baz"',
  );
});
