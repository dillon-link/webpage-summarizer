import { NextResponse } from "next/server";
import { callWithRetry, getLLMClient } from "../llm";
import { EMPTY_BRIEFING, type BriefRequest, type Briefing } from "./types";

const SYSTEM_PROMPT = `You are a concise briefing writer.
You will receive structured information extracted from a webpage. Your task is to turn that information into a clear, useful briefing for someone who has not seen the original webpage.
Focus on:
What the page is about
The most important information
The key people, organizations, products, services, or topics involved
Important facts, numbers, dates, or other details when relevant
Information that a reader would most likely want to know
Adapt the briefing to the type of webpage. A person's profile, company page, product page, article, portfolio, and documentation page should not all be presented in the same way.
Prioritize useful information over completeness. Do not simply repeat every field from the input.
Only use information provided in the input. Do not invent facts or make assumptions.
Write in clear, natural language. Do not mention that the information came from structured data or that an LLM analyzed it.`;

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.length > 0);
}

function normalize(raw: unknown): Briefing {
  if (!raw || typeof raw !== "object") return EMPTY_BRIEFING;
  const r = raw as Record<string, unknown>;
  return {
    title: typeof r.title === "string" ? r.title : "",
    overview: typeof r.overview === "string" ? r.overview : "",
    key_points: asStringArray(r.key_points),
    details: asStringArray(r.details),
  };
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("No JSON object found.");
  return JSON.parse(candidate.slice(first, last + 1));
}

export async function POST(req: Request) {
  let body: BriefRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.data || typeof body.data !== "object") {
    return NextResponse.json(
      { error: "Missing structured data." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_API_KEY is not set. Add it to your .env.local file." },
      { status: 500 },
    );
  }

  const client = getLLMClient();

  const userPrompt = `Create a brief overview of the following webpage based on the structured information provided.
The briefing should help someone understand the page quickly without having to read the original webpage.
Structured webpage information:
${JSON.stringify(body.data, null, 2)}
Write:
A short title
A concise overview
The most important points
Any important details worth knowing
Keep the briefing concise and focus on the information that is most useful for understanding this particular webpage.
Return the result using this JSON structure:
{
  "title": "",
  "overview": "",
  "key_points": [],
  "details": []
}
Use empty arrays when a category does not apply.`;

  try {
    const completion = await callWithRetry(client, {
      model: "gemini-3.1-flash-lite", //gemini-flash-latest, gemini-3.1-flash-lite
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
    });
    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = extractJson(content);
    return NextResponse.json(normalize(parsed));
  } catch (err) {
    const e = err as { status?: number; message?: string; error?: unknown };
    console.error("[/api/brief] LLM call failed", {
      status: e?.status,
      message: e?.message,
      error: e?.error,
    });

    // 429 is a real rate-limit window, not a transient failure. Tell the
    // caller explicitly so the form can surface a "try again shortly" hint
    // instead of a generic 500.
    if (e?.status === 429) {
      return NextResponse.json(
        {
          error:
            "Rate limited by the model provider. Please wait a moment and try again.",
          code: "rate_limited",
        },
        { status: 429 },
      );
    }

    const detail =
      typeof e?.error === "object" && e.error !== null
        ? JSON.stringify(e.error)
        : e?.message ?? "Failed to generate briefing.";
    return NextResponse.json(
      { error: `${e?.status ?? ""} ${detail}`.trim() },
      { status: 500 },
    );
  }
}