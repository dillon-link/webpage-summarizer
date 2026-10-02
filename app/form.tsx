"use client";

import { useState, FormEvent } from "react";
import { ExtractView } from "./components/extract-view";
import { AnalysisView } from "./components/analysis-view";
import { BriefingView } from "./components/briefing-view";

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
                {analyzing ? "Analyzing" : "Analyze"} &rarr;
              </button>
            </div>
            <ExtractView result={result} />
          </article>

          <article className="col col-analyze">
            <div className="col-actions-row">
              <button
                type="button"
                onClick={onBrief}
                disabled={!analysis || briefingLoading}
                className="ghost"
              >
                {briefingLoading ? "Briefing" : "Brief"} &rarr;
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