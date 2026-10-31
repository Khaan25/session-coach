import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSession } from "./parser.ts";
import { redact } from "./redact.ts";

// All values below are invented.
const FAKE_SK = "sk-FAKE0example0key0for0tests0only";
const FAKE_GHP = "ghp_FAKE0example0token0for0tests0123";
const FAKE_AIZA = "AIzaFAKE0example0key0for0tests0only0123456";
const FAKE_HEX = "0123456789abcdef0123456789abcdef0123";
const FAKE_JWT = "eyJFAKEheader.FAKEpayload0example.FAKEsignature0example"; // allowlist secret

test("redacts api key and token shapes", () => {
  assert.equal(redact(`key ${FAKE_SK} end`), "key [REDACTED] end");
  assert.equal(redact(`token=${FAKE_GHP}`), "token=[REDACTED]");
  assert.equal(redact(`k: ${FAKE_AIZA}`), "k: [REDACTED]");
  assert.equal(redact("Authorization: Bearer fake.token-value_123"), "Authorization: [REDACTED]");
});

test("redacts a whole JWT, not just its header", () => {
  const out = redact(`session ${FAKE_JWT} end`);
  assert.equal(out, "session [REDACTED] end");
  for (const segment of FAKE_JWT.split(".")) assert.ok(!out.includes(segment));
});

test("redacts long hex and base64-like strings that mix letters and digits", () => {
  assert.equal(redact(`secret ${FAKE_HEX}`), "secret [REDACTED]");
  assert.equal(
    redact("blob dGhpcy1pcy1hbi1pbnZlbnRlZC1iYXNlNjQtdmFsdWUtMTIz=="),
    "blob [REDACTED]",
  );
});

test("redacts a JWT whose signature starts with sk-", () => {
  const jwt = "eyJFAKEheader.FAKEpayload0example.sk-FAKEsignature0example0123"; // allowlist secret
  assert.equal(redact(`session ${jwt} end`), "session [REDACTED] end");
});

test("redacts Basic auth", () => {
  assert.equal(
    redact("Authorization: Basic ZmFrZXVzZXI6ZmFrZXBhc3N3b3Jk"), //allowlist secret
    "Authorization: [REDACTED]",
  );
});

test("redacts secret assignments, quoted or not, and keeps the name", () => {
  assert.equal(
    redact('PGPASSWORD="fake pass word 1" psql -h localhost'),
    "PGPASSWORD=[REDACTED] psql -h localhost",
  );
  assert.equal(redact("PGPASSWORD='fake pass' psql"), "PGPASSWORD=[REDACTED] psql");
  assert.equal(redact("PGPASSWORD=fakepass psql"), "PGPASSWORD=[REDACTED] psql");
  assert.equal(redact("API_KEY=fake1 SECRET=fake2"), "API_KEY=[REDACTED] SECRET=[REDACTED]");
});

test("keeps git SHAs (40 or 64 hex) but still redacts other hex lengths", () => {
  const sha1 = "0123456789abcdef0123456789abcdef01234567";
  const sha256 = "0123456789abcdef".repeat(4);
  assert.equal(redact(`commit ${sha1}`), `commit ${sha1}`);
  assert.equal(redact(`commit ${sha256}`), `commit ${sha256}`);
  assert.equal(redact("secret 0123456789abcdef0123456789abcdef"), "secret [REDACTED]");
});

test("leaves long words and path segments alone", () => {
  const word = "internationalizationlocalizationconfiguration";
  assert.equal(redact(word), word);
  assert.equal(redact(`/proj/${FAKE_HEX}/file.ts`), `/proj/${FAKE_HEX}/file.ts`);
});

test("redacts email addresses", () => {
  assert.equal(redact("mail jane.doe+x@example.com now"), "mail [EMAIL] now");
});

test("home path prefix becomes ~/ and keeps the rest of the path", () => {
  assert.equal(redact("/Users/fakeuser/Developer/app/src/a.ts"), "~/Developer/app/src/a.ts");
  assert.equal(redact("cat /home/fakeuser/notes/todo.md"), "cat ~/notes/todo.md");
});

test("home path is redacted with or without a slash after the username", () => {
  for (const [input, expected] of [
    ["/home/jane", "~/"],
    ["ls /home/jane", "ls ~/"],
    ["cd /Users/jane && pnpm test", "cd ~/ && pnpm test"],
    ["cd /Users/jane&&pnpm test", "cd ~/&&pnpm test"],
    ["ls /home/jane;pwd", "ls ~/;pwd"],
    ["(cd /Users/jane)", "(cd ~/)"],
  ]) {
    const out = redact(input);
    assert.ok(!out.includes("jane"));
    assert.equal(out, expected);
  }
});

test("a normal sentence is untouched", () => {
  const sentence = "Please add a login page, then run the tests (see /proj/demo/app.ts).";
  assert.equal(redact(sentence), sentence);
});

test("runs in order: key rules first, then email, then home path", () => {
  assert.equal(redact(`${FAKE_SK} a@b.co /Users/fakeuser/x.ts`), "[REDACTED] [EMAIL] ~/x.ts");
});

const line = (obj: unknown) => JSON.stringify(obj);

test("parseSession redacts real event text and only strips the home prefix from read paths", () => {
  const raw = [
    line({
      type: "user",
      message: {
        role: "user",
        content: `email me at fake@example.com, key ${FAKE_SK}`,
      },
    }),
    line({
      type: "assistant",
      message: {
        role: "assistant",
        content: [
          { type: "text", text: `Token ${FAKE_GHP} found` },
          {
            type: "tool_use",
            id: "t1",
            name: "Read",
            input: { file_path: `/Users/fakeuser/${FAKE_HEX}/a.ts` },
          },
          {
            type: "tool_use",
            id: "t2",
            name: "Bash",
            input: { command: "cat /home/fakeuser/.env" },
          },
          {
            type: "tool_use",
            id: "t3",
            name: "Write",
            input: { file_path: "/Users/fakeuser/app/a.ts", content: "x" },
          },
        ],
      },
    }),
    line({
      type: "user",
      message: {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "t2",
            content: `Bearer fake.token-value_123 ${FAKE_HEX}`,
          },
        ],
      },
    }),
  ].join("\n");

  const text = Object.fromEntries(parseSession(raw).events.map((e) => [e.kind, e.text]));
  assert.equal(text.prompt, "email me at [EMAIL], key [REDACTED]");
  assert.equal(text.reply, "Token [REDACTED] found");
  assert.equal(text.read, `~/${FAKE_HEX}/a.ts`);
  assert.equal(text.bash, "cat ~/.env");
  assert.equal(text.write, "~/app/a.ts — wrote 1 line");
  assert.equal(text.result, "[REDACTED] [REDACTED]");
});
