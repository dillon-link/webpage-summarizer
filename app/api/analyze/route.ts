import { NextResponse } from "next/server";
import { callWithRetry, getLLMClient } from "../llm";
import {
  ANALYSIS_FIELDS,
  EMPTY_ANALYSIS,
  type Analysis,
  type AnalyzeRequest,
  type ParsedRequest,
} from "./types";

const SYSTEM_PROMPT = `You are a webpage content analyst.

Your task is to analyze the provided webpage content and identify the most useful information that can be learned from it.

First determine what the webpage is primarily about. It may be, for example:
- A person or profile
- A company or organization
- A product or service
- An article or blog post
- Documentation or a technical resource
- A project or portfolio
- An event
- A general informational page
- Another type of content

Adapt your analysis to the type of webpage.

Extract meaningful information such as:
- The main subject and purpose of the page
- Important facts and details
- Key topics, concepts, products, services, or activities
- People, organizations, or entities mentioned
- Important dates, numbers, or other notable information
- Relevant links or resources
- Useful context that helps someone understand the page

Do not force information into categories that are not relevant to the webpage.

Base your analysis only on the provided webpage content. Do not invent or assume information that is not supported by the content.

Return valid JSON only. Do not include Markdown or explanatory text outside the JSON.`;

function buildUserPrompt(title: string, url: string, text: string): string {
  const schema = ANALYSIS_FIELDS.map((f) => `  "${f}": ${f === "page_type" || f === "subject" || f === "summary" ? '""' : "[]"}`).join(",\n");

  return `Analyze the following webpage and identify the most useful information that someone could learn from it.

Determine what the page is primarily about and summarize the important information in a structured way.

Webpage title:
${title}

Webpage URL:
${url}

Webpage content:
${text}

Return the result using this structure:

{
${schema}
}

Only populate fields that are relevant to the webpage. Use empty arrays when a category does not apply.`;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.length > 0);
}

function normalize(raw: unknown): Analysis {
  if (!raw || typeof raw !== "object") return EMPTY_ANALYSIS;
  const r = raw as Record<string, unknown>;
  return {
    page_type: typeof r.page_type === "string" ? r.page_type : "",
    subject: typeof r.subject === "string" ? r.subject : "",
    summary: typeof r.summary === "string" ? r.summary : "",
    key_information: asStringArray(r.key_information),
    people: asStringArray(r.people),
    organizations: asStringArray(r.organizations),
    products_or_services: asStringArray(r.products_or_services),
    topics: asStringArray(r.topics),
    important_dates: asStringArray(r.important_dates),
    important_numbers: asStringArray(r.important_numbers),
    links: asStringArray(r.links),
    other_relevant_information: asStringArray(r.other_relevant_information),
  };
}

function extractJson(text: string): unknown {
  // Strip ```json fences if the model adds them despite instructions.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  // Grab the first {...} block.
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("No JSON object found.");
  return JSON.parse(candidate.slice(first, last + 1));
}

type LlmError = { status?: number; message?: string; error?: unknown };

function errorResponse(err: unknown): NextResponse {
  const e = err as LlmError;
  console.error("[/api/analyze] LLM call failed", {
    status: e?.status,
    message: e?.message,
    error: e?.error,
  });

  if (e?.status === 429) {
    return NextResponse.json(
      {
        error: "Rate limited by the model provider. Please wait a moment and try again.",
        code: "rate_limited",
      },
      { status: 429 },
    );
  }

  const detail =
    typeof e?.error === "object" && e.error !== null
      ? JSON.stringify(e.error)
      : e?.message ?? "Failed to analyze.";
  return NextResponse.json(
    { error: `${e?.status ?? ""} ${detail}`.trim() },
    { status: 500 },
  );
}

function parseRequest(body: unknown): ParsedRequest | string {
  if (!body || typeof body !== "object") return "Invalid request body.";
  const r = body as Record<string, unknown>;
  const text = typeof r.text === "string" ? r.text : "";
  if (!text) return "Missing webpage content.";
  return {
    title: typeof r.title === "string" ? r.title : "",
    text,
    url: typeof r.url === "string" ? r.url : "",
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = parseRequest(body);
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  if (!process.env.GOOGLE_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_API_KEY is not set. Add it to your .env.local file." },
      { status: 500 },
    );
  }

  const client = getLLMClient();
  const userPrompt = buildUserPrompt(parsed.title, parsed.url, parsed.text);

  try {
    const completion = await callWithRetry(client, {
      model: "gemini-3.1-flash-lite",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
    });

    const content = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json(normalize(extractJson(content)));
  } catch (err) {
    return errorResponse(err);
  }
}