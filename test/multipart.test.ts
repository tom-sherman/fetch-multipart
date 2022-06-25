import { multipart } from "../src/mod.ts";
import { assertEquals } from "std/testing/asserts";

async function collectAll<T>(iterator: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const value of iterator) {
    result.push(value);
  }
  return result;
}

Deno.test({
  name: "works with response and simple formdata",
  fn: async () => {
    const fd = new FormData();
    fd.set("foo", "bar");
    const response = new Response(fd);
    const parts = await collectAll(multipart(response));

    console.log("hello?");
    assertEquals(parts.length, 1);
  },
  ignore: true,
});
