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

// Example from RFC 2046 section 5.1.1 (via issue #2). Trailing whitespace after
// the boundary lines is transport-padding and must be ignored.
const RFC_2046_EXAMPLE = [
  "This is the preamble.  It is to be ignored, though it ",
  "is a handy place for mail composers to include an ",
  "explanatory note to non-MIME compliant readers. ",
  "--simple boundary ",
  "",
  "This is implicitly typed plain ASCII text. ",
  "It does NOT end with a linebreak. ",
  "--simple boundary ",
  "Content-type: text/plain; charset=us-ascii ",
  "",
  "This is explicitly typed plain ASCII text. ",
  "It DOES end with a linebreak. ",
  "",
  "--simple boundary-- ",
  "This is the epilogue.  It is also to be ignored.",
].join("\r\n");

test("ignores preamble and epilogue (RFC 2046 example)", async () => {
  const response = new Response(RFC_2046_EXAMPLE, {
    headers: { "content-type": 'multipart/mixed; boundary="simple boundary"' },
  });
  const parts = await collectAll(multipart(response));

  assert.equal(parts.length, 2);

  assert.equal(parts[0]!.headers.get("content-type"), null);
  assert.equal(
    await parts[0]!.text(),
    "This is implicitly typed plain ASCII text. \r\nIt does NOT end with a linebreak. ",
  );

  assert.equal(
    parts[1]!.headers.get("content-type"),
    "text/plain; charset=us-ascii",
  );
  assert.equal(
    await parts[1]!.text(),
    "This is explicitly typed plain ASCII text. \r\nIt DOES end with a linebreak. \r\n",
  );
});

test("ignores epilogue when there is no preamble", async () => {
  const body = [
    "--b",
    "",
    "one",
    "--b",
    "",
    "two",
    "--b--",
    "the epilogue",
    "--b",
    "",
    "this is not a part",
  ].join("\r\n");
  const response = new Response(body, {
    headers: { "content-type": "multipart/mixed; boundary=b" },
  });
  const parts = await collectAll(multipart(response));

  assert.deepEqual(await Promise.all(parts.map((p) => p.text())), [
    "one",
    "two",
  ]);
});

test("preamble containing something that looks like a boundary is ignored", async () => {
  // "--b" inside the preamble that is not at the start of a line is not a
  // delimiter and must not be treated as one.
  const body = ["preamble --b not a boundary", "--b", "", "one", "--b--"].join(
    "\r\n",
  );
  const response = new Response(body, {
    headers: { "content-type": "multipart/mixed; boundary=b" },
  });
  const parts = await collectAll(multipart(response));

  assert.deepEqual(await Promise.all(parts.map((p) => p.text())), ["one"]);
});

test("rejects a body with no close delimiter", async () => {
  const body = ["--b", "", "one", "--b", "", "two"].join("\r\n");
  const response = new Response(body, {
    headers: { "content-type": "multipart/mixed; boundary=b" },
  });

  await assert.rejects(collectAll(multipart(response)));
});

test("a near-miss delimiter inside part data is treated as data", async () => {
  // RFC 2046 §5.1.1: CRLF--boundary is only a delimiter when followed by "--"
  // or transport-padding CRLF. Anything else is part data (issue #12).
  const body = [
    "--b",
    "",
    "one",
    "--bQQ",
    "--b-QQ",
    "--b\rQQ",
    "--b",
    "",
    "two",
    "--b--",
  ].join("\r\n");
  const response = new Response(body, {
    headers: { "content-type": "multipart/mixed; boundary=b" },
  });
  const parts = await collectAll(multipart(response));

  assert.deepEqual(await Promise.all(parts.map((p) => p.text())), [
    "one\r\n--bQQ\r\n--b-QQ\r\n--b\rQQ",
    "two",
  ]);
});

test("a near-miss dash-boundary at the start of the body is preamble", async () => {
  const body = ["--bQQ", "--b", "", "one", "--b--"].join("\r\n");
  const response = new Response(body, {
    headers: { "content-type": "multipart/mixed; boundary=b" },
  });
  const parts = await collectAll(multipart(response));

  assert.deepEqual(await Promise.all(parts.map((p) => p.text())), ["one"]);
});
