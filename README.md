# Webpage Summarizer

Paste a link. Get the words, the structure, and a brief. That's it.

A small Next.js app that fetches a URL, pulls out the readable text (capped at 8,000 characters), then lets you run two more passes on top:

- **Analyze** — extracts a structured view of the page (subject, page type, summary, key information, people, organizations, products/services, topics, dates, numbers, links, and other relevant information).
- **Brief** — turns the analysis into a short briefing with a title, overview, most important points, and important details.

## Run it

```bash
nvm use 24
npm install
npm run dev
```

Open http://localhost:3000.

## Stack

- Next.js 16 (App Router)
- React 19
- cheerio for HTML parsing
- OpenAI for the Analyze and Brief passes
- Node 24

## How it works

The UI is a three-column flow. The buttons point rightward to the next column:

```
[Extract] → [Analyze] → [Brief]
```

## Scripts

| Command       | Description              |
| ------------- | ------------------------ |
| `npm run dev` | Start the dev server     |
| `npm run build` | Build for production   |
| `npm run start` | Start the production build |
