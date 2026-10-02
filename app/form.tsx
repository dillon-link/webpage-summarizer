"use client";

import { useState, FormEvent } from "react";

type ExtractResult = {
  url: string;
  title: string;
  text: string;
  truncated: boolean;
  chars: number;
};

type Analysis = {
  page_type: string;
  subject: string;
  summary: string;
  key_information: string[];
  people: string[];
  organizations: string[];
  products_or_services: string[];
  topics: string[];
  important_dates: string[];
  important_numbers: string[];
  links: string[];
  other_relevant_information: string[];
};

type Briefing = {
  title: string;
  overview: string;
  key_points: string[];
  details: string[];
};

const MAX_CHARS = 8000;

export function Form() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading || analyzing || briefingLoading) return;
    setLoading(true);
    setError(null);
    setAnalysisError(null);
    setBriefingError(null);
    setResult(null);
    setAnalysis(null);
    setBriefing(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok || "error" in data) {
        setError((data as { error?: string }).error ?? "Something went wrong.");
      } else {
        setResult(data as ExtractResult);
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  async function onAnalyze() {
    if (!result || analyzing) return;
    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysis(null);
    setBriefing(null);
    setBriefingError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: result.title,
          text: result.text,
          url: result.url,
        }),
      });
      const data = await res.json();
      if (!res.ok || "error" in data) {
        setAnalysisError(
          (data as { error?: string }).error ?? "Something went wrong.",
        );
      } else {
        setAnalysis(data as Analysis);
      }
    } catch {
      setAnalysisError("Could not reach the server.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function onBrief() {
    if (!analysis || briefingLoading) return;
    setBriefingLoading(true);
    setBriefingError(null);
    setBriefing(null);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: analysis }),
      });
      const data = await res.json();
      if (!res.ok || "error" in data) {
        setBriefingError(
          (data as { error?: string }).error ?? "Something went wrong.",
        );
      } else {
        setBriefing(data as Briefing);
      }
    } catch {
      setBriefingError("Could not reach the server.");
    } finally {
      setBriefingLoading(false);
    }
  }

  function onReset() {
    setResult(null);
    setAnalysis(null);
    setBriefing(null);
    setError(null);
    setAnalysisError(null);
    setBriefingError(null);
  }

  return (
    <>
      <form onSubmit={onSubmit}>
        <input
          type="url"
          inputMode="url"
          autoComplete="off"
          autoFocus
          spellCheck={false}
          placeholder="https://example.com/article"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading || analyzing || briefingLoading}
          aria-label="URL to extract"
        />
        <button type="submit" disabled={!url.trim() || loading || analyzing || briefingLoading}>
          {loading ? "Extracting" : "Extract"}
        </button>
      </form>
      <div className="meta">
        <span>{url.length} characters</span>
        <span>cap {MAX_CHARS.toLocaleString()}</span>
      </div>

      {error && <p className="error">{error}</p>}

      {(result || analysis || briefing) && (
        <section className="results">
          <article className="col col-extract">
            <div className="col-actions-row">
              <button
                type="button"
                onClick={onAnalyze}
                disabled={!result || analyzing || briefingLoading}
                className="ghost"
              >
                {analyzing ? "Analyzing" : "Analyze"}
              </button>
            </div>
            {result ? (
              <>
                <h2 className="col-title">Extract</h2>
                <p className="from">{result.url}</p>
                <h3 className="col-title-row">{result.title}</h3>
                <pre className="body">{result.text}</pre>
                <div className="meta">
                  <span>
                    {result.chars.toLocaleString()} characters
                    {result.truncated ? " · truncated" : ""}
                  </span>
                </div>
              </>
            ) : (
              <div className="col-empty">
                <h2 className="col-title">Extract</h2>
                <p className="col-empty-text">Awaiting input.</p>
              </div>
            )}
          </article>

          <article className="col col-analyze">
            <div className="col-actions-row">
              <button
                type="button"
                onClick={onBrief}
                disabled={!analysis || briefingLoading}
                className="ghost"
              >
                {briefingLoading ? "Briefing" : "Brief"}
              </button>
            </div>
            {analysisError ? (
              <>
                <h2 className="col-title">Analyze</h2>
                <p className="error">{analysisError}</p>
              </>
            ) : analysis ? (
              <>
                <h2 className="col-title">Analyze</h2>
                <AnalysisView a={analysis} />
              </>
            ) : (
              <div className="col-empty">
                <h2 className="col-title">Analyze</h2>
                <p className="col-empty-text">Awaiting input.</p>
              </div>
            )}
          </article>

          <article className="col col-brief">
            <div className="col-actions-row">
              <button
                type="button"
                onClick={onReset}
                disabled={!result && !analysis && !briefing}
                className="ghost"
              >
                Reset
              </button>
            </div>
            {briefingError ? (
              <>
                <h2 className="col-title">Brief</h2>
                <p className="error">{briefingError}</p>
              </>
            ) : briefing ? (
              <>
                <h2 className="col-title">Brief</h2>
                <BriefingView b={briefing} />
              </>
            ) : (
              <div className="col-empty">
                <h2 className="col-title">Brief</h2>
                <p className="col-empty-text">Awaiting input.</p>
              </div>
            )}
          </article>
        </section>
      )}
    </>
  );
}

function List({ items, title }: { items?: string[]; title: string }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <>
      <h3 className="section-title">{title}</h3>
      <ul className="bullets">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </>
  );
}

function AnalysisView({ a }: { a: Analysis }) {
  return (
    <section className="analysis">
      <h3 className="section-title">Subject</h3>
      <p className="prose">{a.subject || a.page_type}</p>

      {a.page_type && (
        <>
          <h3 className="section-title">Page type</h3>
          <p className="prose">{a.page_type}</p>
        </>
      )}

      {a.summary && (
        <>
          <h3 className="section-title">Summary</h3>
          <p className="prose">{a.summary}</p>
        </>
      )}

      <List items={a.key_information} title="Key information" />
      <List items={a.people} title="People" />
      <List items={a.organizations} title="Organizations" />
      <List items={a.products_or_services} title="Products or services" />
      <List items={a.topics} title="Topics" />
      <List items={a.important_dates} title="Important dates" />
      <List items={a.important_numbers} title="Important numbers" />
      <List items={a.links} title="Links" />
      <List
        items={a.other_relevant_information}
        title="Other relevant information"
      />
    </section>
  );
}

function BriefingView({ b }: { b: Briefing }) {
  const hasKeyPoints = Array.isArray(b.key_points) && b.key_points.length > 0;
  const hasDetails = Array.isArray(b.details) && b.details.length > 0;
  return (
    <section className="analysis">
      {b.title && <p className="prose briefing-title">{b.title}</p>}
      {b.overview && <p className="prose">{b.overview}</p>}
      {hasKeyPoints && (
        <>
          <h3 className="section-title">Most important points</h3>
          <ul className="bullets">
            {b.key_points.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </>
      )}
      {hasDetails && (
        <>
          <h3 className="section-title">Important details</h3>
          <ul className="bullets">
            {b.details.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
