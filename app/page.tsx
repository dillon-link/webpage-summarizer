import { Form } from "./form";

export default function Page() {
  return (
    <main>
      <header>
        <p className="eyebrow">Extract · Analyze · Brief</p>
        <p className="lede">Paste a link. Get the words.</p>
      </header>
      <Form />
    </main>
  );
}