# langbly-js

[![npm](https://img.shields.io/npm/v/langbly)](https://www.npmjs.com/package/langbly)
[![TypeScript](https://img.shields.io/badge/TypeScript-first--class-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Official JavaScript/TypeScript SDK for the [Langbly](https://langbly.com) translation API — a drop-in replacement for Google Translate v2, powered by LLMs.

**5-10x cheaper than Google Translate** · **Better quality** · **Switch in one PR**

## Installation

```bash
npm install langbly
```

## Quick Start

```typescript
import { Langbly } from "langbly";

const client = new Langbly({ apiKey: "your-api-key" });

// Translate text
const result = await client.translate("Hello world", { target: "nl" });
console.log(result.text); // "Hallo wereld"

// Batch translate
const results = await client.translate(["Hello", "Goodbye"], { target: "nl" });
results.forEach((r) => console.log(r.text));

// Detect language
const detection = await client.detect("Bonjour le monde");
console.log(detection.language); // "fr"

// List supported languages
const languages = await client.languages({ target: "en" });
```

## Migrate from Google Translate

Already using `@google-cloud/translate`? Switching takes 2 minutes:

```typescript
// Before (Google Translate)
import { Translate } from "@google-cloud/translate/build/src/v2";
const client = new Translate();
const [translation] = await client.translate("Hello", "nl");

// After (Langbly) — same concepts, better translations, 5x cheaper
import { Langbly } from "langbly";
const client = new Langbly({ apiKey: "your-key" });
const result = await client.translate("Hello", { target: "nl" });
```

→ Full migration guide: [langbly.com/docs/migrate-google](https://langbly.com/docs/migrate-google)

## Features

- **Google Translate v2 API compatible** — same endpoint format
- **Zero dependencies** — uses native `fetch`
- **Full TypeScript types** — interfaces for all request/response shapes
- **Auto-retry** — exponential backoff on 429/5xx with Retry-After support
- **Typed errors** — `RateLimitError`, `AuthenticationError`, `LangblyError`
- **Batch translation** — translate multiple texts in one request
- **Language detection** — automatic source language identification
- **HTML support** — translate HTML while preserving tags

## Error Handling

```typescript
import { Langbly, RateLimitError, AuthenticationError } from "langbly";

const client = new Langbly({ apiKey: "your-key" });

try {
  const result = await client.translate("Hello", { target: "nl" });
} catch (err) {
  if (err instanceof AuthenticationError) {
    console.error("Invalid API key");
  } else if (err instanceof RateLimitError) {
    console.error(`Rate limited — retry after ${err.retryAfter}s`);
  }
}
```

## API Reference

### `new Langbly(options)`

Create a client instance.

- `apiKey` (string): Your Langbly API key — [get one free](https://langbly.com/signup)
- `baseUrl` (string, optional): Override API URL (default: `https://api.langbly.com`)
- `timeout` (number, optional): Request timeout in ms (default: 30000)
- `maxRetries` (number, optional): Retries for transient errors (default: 2)

### `client.translate(text, options)`

- `text` (string | string[]): Text(s) to translate
- `options.target` (string): Target language code
- `options.source` (string, optional): Source language code
- `options.format` ("text" | "html", optional): Input format

### `client.detect(text)`

- `text` (string): Text to analyze

### `client.languages(options?)`

- `options.target` (string, optional): Language code for names

## Links

- [Website](https://langbly.com)
- [Documentation](https://langbly.com/docs)
- [Compare: Langbly vs Google vs DeepL](https://langbly.com/compare)
- [Python SDK](https://github.com/Langbly/langbly-python)

## License

MIT
