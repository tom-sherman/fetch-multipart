import { assertEquals, assertThrows } from "std/testing/asserts";
import { BodyPart } from "../src/mod.ts";

Deno.test("errors when setting to headers, body, or bodyUsed", () => {
  const bodyPart = new BodyPart();

  assertThrows(() => {
    // @ts-expect-error .
    bodyPart.headers = new Headers();
  }, TypeError);

  assertThrows(() => {
    // @ts-expect-error .
    bodyPart.body = new ReadableStream();
  }, TypeError);

  assertThrows(() => {
    // @ts-expect-error .
    bodyPart.bodyUsed = true;
  }, TypeError);
});

Deno.test("can construct bodypart from text", async () => {
  assertEquals(await new BodyPart("hello").text(), "hello");
});

Deno.test("can construct bodypart from text-like", async () => {
  const body = 1 as unknown as string;
  assertEquals(await new BodyPart(body).text(), "1");
});

Deno.test("can construct bodypart from uint8array", async () => {
  const body = new TextEncoder().encode("hello");
  assertEquals(await new BodyPart(body).text(), "hello");
});

Deno.test("can construct bodypart from arraybuffer", async () => {
  const body = new TextEncoder().encode("hello").buffer;
  assertEquals(await new BodyPart(body).text(), "hello");
});

Deno.test("can construct bodypart from blob", async () => {
  const body = new Blob(["hello"]);
  assertEquals(await new BodyPart(body).text(), "hello");
});

Deno.test("can construct bodypart from urlsearchparams", async () => {
  const body = new URLSearchParams("foo=bar&baz=baz");
  assertEquals(await new BodyPart(body).text(), "foo=bar&baz=baz");
});
