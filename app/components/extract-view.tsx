"use client";

type ExtractResult = {
  url: string;
  title: string;
  text: string;
  truncated: boolean;
  chars: number;
};

export function ExtractView({ result }: { result: ExtractResult | null }) {
  if (!result) {
    return (
      <div className="col-empty">
        <h2 className="col-title">Extract</h2>
        <p className="col-empty-text">Awaiting input.</p>
      </div>
    );
  }
  return (
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
  );
}