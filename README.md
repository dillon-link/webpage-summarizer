# Extract

Paste a link. Get the words. That's it.

A tiny Next.js app that fetches a URL, pulls out the readable text, and caps it at 8,000 characters.

## Run it

```bash
nvm use 24
npm install
npm run dev
```

Open http://localhost:3000.

## Stack

- Next.js 16
- React 19
- cheerio for HTML parsing
- Node 24

## How it works

- `app/page.tsx` renders the form.
- `app/form.tsx` posts the URL to `/api/extract`.
- `app/api/extract/route.ts` fetches the page, strips scripts/styles/nav, picks `<article>` or `<main>` (falls back to `<body>`), and returns the text trimmed to 8,000 chars.