// One-time conversion: ESBD_Statnice_KOMPLET.docx (a REAL Word .docx, despite the
// build spec calling it markdown) -> clean, human-editable markdown at src/data/source.md.
//
// mammoth maps the Word heading styles to #/##/### and preserves bold/italic/lists, but it
// (a) prefixes headings with <a id="..."> anchors, (b) writes bold as __x__ (we want **x**),
// and (c) backslash-escapes ASCII punctuation. We undo those so src/data/source.md matches
// the markdown the parser (scripts/parse.mjs) expects.

import mammoth from "mammoth";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = "ESBD_Statnice_KOMPLET.docx";
const OUT = path.join("src", "data", "source.md");

const { value, messages } = await mammoth.convertToMarkdown({ path: SRC });

let md = value;

// 1) Strip mammoth's heading anchors: <a id="abc123"></a>
md = md.replace(/<a id="[^"]*"><\/a>/g, "");

// 2) Unescape backslash-escaped ASCII punctuation that mammoth adds (e.g. mass\-market\. -> mass-market.)
md = md.replace(/\\([\\`*_{}\[\]()#+\-.!~>])/g, "$1");

// 3) Bold: mammoth emits __strong__; the spec/parser use **strong** (key-term candidates).
md = md.replace(/__(.+?)__/g, "**$1**");

// 4) Re-assert canonical heading levels for the known structural lines (defensive & idempotent).
//    Word styles already map these, but this guarantees the parser's regexes hold even if a
//    heading slipped through as plain text. Divider lines (## Study Material: ...) are left as-is.
md = md
  .split("\n")
  .map((line) => {
    const text = line.replace(/^#{1,6}\s*/, "").trim();
    if (/^ESBD State Exam\s+—\s+.+/.test(text)) return `# ${text}`;
    if (/^Q\d+\s+—\s+.+/.test(text)) return `## ${text}`;
    if (/^THEORY$/.test(text)) return "### THEORY";
    if (/^PRACTICAL APPLICATION$/.test(text)) return "### PRACTICAL APPLICATION";
    return line;
  })
  .join("\n");

// 5) Collapse 3+ blank lines to a single blank line; trim trailing whitespace per line.
md = md
  .split("\n")
  .map((l) => l.replace(/[ \t]+$/g, ""))
  .join("\n")
  .replace(/\n{3,}/g, "\n\n")
  .trim() + "\n";

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, md, "utf8");

const warnings = messages.filter((m) => m.type === "warning").length;
console.log(`Converted ${SRC} -> ${OUT}`);
console.log(`  ${md.split("\n").length} lines, ${md.length} chars`);
console.log(`  mammoth messages: ${messages.length} (${warnings} warnings — unrecognised Title/Subtitle styles are expected and harmless)`);
