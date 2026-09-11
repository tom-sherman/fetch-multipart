import { test } from "node:test";
import assert from "node:assert/strict";
import { BodyPart } from "../src/mod.ts";

test("errors when setting to headers, body, or bodyUsed", () => {
  const bodyPart = new BodyPart();

  assert.throws(() => {
    // @ts-expect-error .
    bodyPart.headers = new Headers();
  }, TypeError);

  assert.throws(() => {
    // @ts-expect-error .
    bodyPart.body = new ReadableStream();
  }, TypeError);

  assert.throws(() => {
    // @ts-expect-error .
    bodyPart.bodyUsed = true;
  }, TypeError);
});

test("can construct bodypart from text", async () => {
  assert.equal(await new BodyPart("hello").text(), "hello");
});

test("can construct bodypart from text-like", async () => {
  const body = 1 as unknown as string;
  assert.equal(await new BodyPart(body).text(), "1");
});

test("can construct bodypart from uint8array", async () => {
  const body = new TextEncoder().encode("hello");
  assert.equal(await new BodyPart(body).text(), "hello");
});

test("can construct bodypart from arraybuffer", async () => {
  const body = new TextEncoder().encode("hello").buffer;
  assert.equal(await new BodyPart(body).text(), "hello");
});

test("can construct bodypart from blob", async () => {
  const body = new Blob(["hello"]);
  assert.equal(await new BodyPart(body).text(), "hello");
});

test("can construct bodypart from urlsearchparams", async () => {
  const body = new URLSearchParams("foo=bar&baz=baz");
  assert.equal(await new BodyPart(body).text(), "foo=bar&baz=baz");
});

test("can read bodypart as bytes", async () => {
  assert.deepEqual(
    await new BodyPart("hello").bytes(),
    new TextEncoder().encode("hello"),
  );
});
