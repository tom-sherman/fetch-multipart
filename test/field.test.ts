import { assertThrows } from "std/testing/asserts";
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
