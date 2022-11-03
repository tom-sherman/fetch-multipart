import { assertEquals, assertThrows } from "std/testing/asserts";
import { Field } from "../src/mod.ts";

Deno.test("errors when setting to headers, body, or bodyUsed", () => {
  const field = new Field();

  assertThrows(() => {
    // @ts-expect-error .
    field.headers = new Headers();
  }, TypeError);

  assertThrows(() => {
    // @ts-expect-error .
    field.body = new ReadableStream();
  }, TypeError);

  assertThrows(() => {
    // @ts-expect-error .
    field.bodyUsed = true;
  }, TypeError);
});

Deno.test("can construct field from text", async () => {
  assertEquals(await new Field("hello").text(), "hello");
});

Deno.test("can construct field from text-like", async () => {
  const body = 1 as unknown as string;
  assertEquals(await new Field(body).text(), "1");
});

Deno.test("can construct field from uint8array", async () => {
  const body = new TextEncoder().encode("hello");
  assertEquals(await new Field(body).text(), "hello");
});

Deno.test("can construct field from arraybuffer", async () => {
  const body = new TextEncoder().encode("hello").buffer;
  assertEquals(await new Field(body).text(), "hello");
});

Deno.test("can construct field from blob", async () => {
  const body = new Blob(["hello"]);
  assertEquals(await new Field(body).text(), "hello");
});

Deno.test("can construct field from urlsearchparams", async () => {
  const body = new URLSearchParams("foo=bar&baz=baz");
  assertEquals(await new Field(body).text(), "foo=bar&baz=baz");
});
