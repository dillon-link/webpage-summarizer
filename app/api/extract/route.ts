import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { ExtractRequest } from "./types";

export const runtime = "nodejs";

const MAX_CHARS = 8_000;
const TIMEOUT_MS = 10_000;

// Per-section limits keep the output bounded while still surfacing every kind of content.
const SECTION_CAPS: Record<string, number> = {
  headings: 1_500,
  paragraphs: 3_000,
  lists: 2_000,
  code: 2_000,
  tables: 1_500,
  links: 1_000,
  images: 800,
};

const NOISE_SELECTOR =
  "script, style, noscript, iframe, svg, canvas, video, audio, picture, source, " +
  "aside, nav, footer, form, button, input, select, option, textarea, " +
  "[role=navigation], [role=banner], [role=contentinfo], [aria-hidden=true]";

function isAllowedUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function indent(level: number): string {
  return "  ".repeat(level);
}

function push(bucket: string[], text: string) {
  if (text) bucket.push(text);
}

function truncate(bucket: string[], key: string): string {
  const cap = SECTION_CAPS[key] ?? 1_000;
  const joined = bucket.join("\n");
  if (joined.length <= cap) return joined;
  return joined.slice(0, cap) + "…";
}

function extractSection($: CheerioAPI, root: any, key: string): string {
  const bucket: string[] = [];

  if (key === "headings") {
    $(root)
      .find("h1, h2, h3, h4, h5, h6")
      .each((_, el) => {
        const level = parseInt(el.tagName.replace("h", ""), 10);
        const t = clean($(el).text());
        if (t) push(bucket, `${indent(level - 1)}H${level}  ${t}`);
      });
  }

  if (key === "paragraphs") {
    $(root)
      .find("p")
      .each((_, el) => {
        const t = clean($(el).text());
        if (t) push(bucket, t);
      });
  }

  if (key === "lists") {
    $(root)
      .find("ul, ol")
      .each((_, el) => {
        const items: string[] = [];
        $(el)
          .children("li")
          .each((__, li) => {
            const t = clean($(li).text());
            if (t) items.push(`- ${t}`);
          });
        if (items.length) push(bucket, items.join("\n"));
      });
  }

  if (key === "code") {
    $(root)
      .find("pre, code")
      .each((_, el) => {
        // Skip <code> nested inside a <pre> we already captured.
        if (el.type === "tag" && el.name === "code" && $(el).parent("pre").length) {
          return;
        }
        const raw = $(el).text().replace(/\n[ \t]+/g, "\n").trim();
        if (raw) push(bucket, "```\n" + raw + "\n```");
      });
  }

  if (key === "tables") {
    $(root)
      .find("table")
      .each((_, el) => {
        const rows: string[] = [];
        $(el)
          .find("tr")
          .each((__, tr) => {
            const cells: string[] = [];
            $(tr)
              .find("th, td")
              .each((___, cell) => {
                cells.push(clean($(cell).text()));
              });
            if (cells.length) rows.push("| " + cells.join(" | ") + " |");
          });
        if (rows.length) push(bucket, rows.join("\n"));
      });
  }

  if (key === "links") {
    $(root)
      .find("a[href]")
      .each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const text = clean($(el).text()) || href;
        // Skip in-page anchors and empty hrefs.
        if (!href || href.startsWith("#")) return;
        push(bucket, `- [${text}](${href})`);
      });
  }

  if (key === "images") {
    $(root)
      .find("img")
      .each((_, el) => {
        const alt = clean($(el).attr("alt") ?? "");
        const src = $(el).attr("src") ?? "";
        if (alt) push(bucket, `- (alt) ${alt}${src ? "  →  " + src : ""}`);
        else if (src) push(bucket, `- (no alt)  ${src}`);
      });
  }

  return truncate(bucket, key);
}

export async function POST(req: Request) {
  let body: ExtractRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url)
    return NextResponse.json({ error: "Missing url." }, { status: 400 });
  if (!isAllowedUrl(url))
    return NextResponse.json(
      { error: "Only http(s) URLs are allowed." },
      { status: 400 },
    );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let html: string;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ExtractBot/0.1; +https://example.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok)
      return NextResponse.json(
        { error: `Fetch failed (${res.status}).` },
        { status: 502 },
      );
    html = await res.text();
  } catch (err) {
    const msg =
      err instanceof Error && err.name === "AbortError"
        ? "Request timed out."
        : "Could not fetch the page.";
    return NextResponse.json({ error: msg }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }

  const $ = cheerio.load(html);
  const title = clean($("title").text()) || "No title found";
  const description = clean($('meta[name="description"]').attr("content") ?? "");

  $(
    "body " +
      NOISE_SELECTOR.replace(/^body /, "") +
      ", noscript, [hidden]",
  ).remove();

  const scope =
    $("article").first().length
      ? $("article").first()
      : $("main").first().length
        ? $("main").first()
        : $("body");

  const sections = [
    "headings",
    "paragraphs",
    "lists",
    "code",
    "tables",
    "links",
    "images",
  ] as const;

  const blocks: string[] = [];
  blocks.push(`# ${title}`);
  if (description) blocks.push(`> ${description}`);
  blocks.push(`Source: ${url}\n`);

  for (const key of sections) {
    const content = extractSection($, scope.get(0), key);
    if (!content) continue;
    blocks.push(`## ${key}\n${content}\n`);
  }

  let out = blocks.join("\n").trim();
  let truncated = false;
  if (out.length > MAX_CHARS) {
    out = out.slice(0, MAX_CHARS) + "…";
    truncated = true;
  }

  return NextResponse.json({ url, title, text: out, truncated, chars: out.length });
}