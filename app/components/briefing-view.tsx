"use client";

type Briefing = {
  title: string;
  overview: string;
  key_points: string[];
  details: string[];
};

export function BriefingView({ b }: { b: Briefing }) {
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