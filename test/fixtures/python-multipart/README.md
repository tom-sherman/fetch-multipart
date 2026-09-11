# python-multipart fixtures

The files under `http/` are vendored verbatim from
[Kludex/python-multipart](https://github.com/Kludex/python-multipart),
`tests/test_data/http/`, at commit
`d9cb4c62db5b9defeeaa99bfe0e4da51e760108f` (2026-08-09).

They are licensed under the Apache License, Version 2.0 — see
[LICENSE.txt](./LICENSE.txt) in this directory, which is a copy of the
upstream license. Copyright belongs to the python-multipart authors.

Each case is a pair of files:

- `<name>.http` — the raw multipart body bytes.
- `<name>.yaml` — the boundary parameter and either the expected list of
  parts (`expected: [...]`, with `data` as `!!binary`) or an expected parse
  failure (`expected: { error: <byte offset> }`).

They are consumed by [`../../python-multipart.test.ts`](../../python-multipart.test.ts).
Do not edit these files; re-vendor from upstream instead.

## Local deviations from upstream

- `http/single_field_blocks.yaml`: `boundary` changed from `--boundary` to
  `boundary`. Upstream's yaml is wrong (the body's delimiter line is
  `--boundary`, so the boundary parameter is `boundary`); it goes unnoticed
  there because upstream excludes this fixture from its yaml-driven run and
  feeds it the boundary by hand.
- `http/single_field_single_file.yaml`: removed the `content_type: 'text/plain'`
  key from the `field` part. That part has no `Content-Type` header in the
  body; upstream never asserts `content_type` for fields, so the key was
  unverified.
- `http/bad_initial_boundary.{http,yaml}`: removed. The first delimiter is
  mistyped, so per RFC 2046 §5.1.1 the whole body is preamble followed by a
  close delimiter, i.e. zero parts. python-multipart rejects it (it doesn't
  support preambles at all); we accept it and yield no parts, which is what
  `Response.prototype.formData()` in Node/undici does with the same bytes. See
  https://github.com/tom-sherman/fetch-multipart/issues/13.
