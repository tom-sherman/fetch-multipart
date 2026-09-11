import { multipart } from "../src/mod.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";

/**
 * Runs the multipart body corpus vendored from python-multipart
 * (see test/fixtures/python-multipart/README.md) against `multipart()`.
 *
 * Every `<name>.http` file is a raw body; the matching `<name>.yaml` gives the
 * boundary parameter and either the list of parts we expect to get back or
 * that parsing must fail.
 */

const fixturesDir = new URL(
  "./fixtures/python-multipart/http/",
  import.meta.url,
);

/**
 * Fixtures the parser is known to fail today, run with `test.expectFailure`:
 * they pass while they keep failing and fail once they start passing, so the
 * entry has to be removed. Fix the parser, delete the name, repeat until the
 * set is empty.
 */
const KNOWN_FAILURES = new Set<string>([
  // https://github.com/tom-sherman/fetch-multipart/issues/14
  // These expect Content-Transfer-Encoding (base64 / quoted-printable) to be
  // decoded, which python-multipart does. RFC 7578 §4.7 deprecates it for
  // multipart/form-data; whether to honour it here is an open decision.
  "base64_encoding",
  "mixed_case_headers",
  "mixed_plain_and_base64_encoding",
  "quoted_printable_encoding",
]);

interface ExpectedPart {
  name: string;
  type: "field" | "file";
  file_name?: string;
  content_type?: string;
  data: Uint8Array;
}

interface Fixture {
  boundary: string;
  expected: ExpectedPart[] | { error: number };
}

const fixtureNames = (await readdir(fixturesDir))
  .filter((file) => file.endsWith(".http"))
  .map((file) => file.slice(0, -".http".length))
  .sort();

for (const name of fixtureNames) {
  const run = KNOWN_FAILURES.has(name) ? test.expectFailure : test;
  run(`python-multipart: ${name}`, () => runFixture(name));
}

async function runFixture(name: string): Promise<void> {
  const body = await readFile(new URL(`${name}.http`, fixturesDir));
  const fixture = parseYaml(
    await readFile(new URL(`${name}.yaml`, fixturesDir), "utf8"),
    { customTags: ["binary"] },
  ) as Fixture;

  const parts = collectAll(
    multipart({
      body: new Blob([body]).stream(),
      headers: {
        "content-type": `multipart/form-data; boundary=${fixture.boundary}`,
      },
    }),
  );

  if (!Array.isArray(fixture.expected)) {
    // python-multipart also checks the byte offset the error was raised at; we
    // have no offset to compare, so rejecting is enough.
    await assert.rejects(
      parts,
      `expected a parse error at byte ${fixture.expected.error}`,
    );
    return;
  }

  const actual = await parts;
  assert.equal(
    actual.length,
    fixture.expected.length,
    `expected ${fixture.expected.length} parts, got ${actual.length}`,
  );

  for (const [i, expected] of fixture.expected.entries()) {
    const part = actual[i]!;
    const label = `part ${i} (${expected.name})`;

    const disposition = parseContentDisposition(
      part.headers.get("content-disposition"),
    );
    assert.equal(disposition.get("name"), expected.name, `${label}: name`);

    if (expected.type === "file") {
      assert.equal(
        disposition.get("filename"),
        expected.file_name,
        `${label}: filename`,
      );
    } else {
      assert.equal(
        disposition.get("filename"),
        undefined,
        `${label}: field should not have a filename`,
      );
    }

    if (expected.content_type !== undefined) {
      assert.equal(
        part.headers.get("content-type"),
        expected.content_type,
        `${label}: content-type`,
      );
    }

    assert.deepEqual(
      await part.bytes(),
      new Uint8Array(expected.data),
      `${label}: body`,
    );
  }
}

/**
 * Just enough Content-Disposition parsing for the corpus: `key=value` and
 * `key="value"` parameters separated by `;`. Keys are case-insensitive.
 */
function parseContentDisposition(value: string | null): Map<string, string> {
  const params = new Map<string, string>();
  if (value === null) {
    return params;
  }
  for (const segment of value.split(";").slice(1)) {
    const match = /^\s*([^=\s]+)\s*=\s*(?:"([^"]*)"|([^\s;]*))\s*$/.exec(
      segment,
    );
    if (match) {
      params.set(match[1]!.toLowerCase(), match[2] ?? match[3] ?? "");
    }
  }
  return params;
}

async function collectAll<T>(iterator: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const value of iterator) {
    result.push(value);
  }
  return result;
}
