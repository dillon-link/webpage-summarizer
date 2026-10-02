"use client";

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

export function AnalysisView({ a }: { a: Analysis }) {
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