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

Deno.test("preamble is ignored", async () => {
  const formData = new FormData();
  formData.append("a", "b");
  formData.append("c", "10");
  const response = new Response(formData);

  const parts = await collectAll(multipart(
    new Response("this is a preamble\r\n" + await response.text(), {
      headers: {
        "Content-Type": response.headers.get("Content-Type")!,
      },
    }),
  ));

  assertEquals(parts.length, 2);
});

Deno.test("epilogue is ignored", async () => {
  const formData = new FormData();
  formData.append("a", "b");
  formData.append("c", "10");
  const response = new Response(formData);

  const parts = await collectAll(multipart(
    new Response(await response.text() + "\r\nthis is an epilogue", {
      headers: {
        "Content-Type": response.headers.get("Content-Type")!,
      },
    }),
  ));

  assertEquals(parts.length, 2);
});
