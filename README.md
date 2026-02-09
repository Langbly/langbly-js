# langbly-js

Official JavaScript/TypeScript SDK for the [Langbly](https://langbly.com) translation API — a drop-in replacement for Google Translate v2.

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
```

## Google Translate Migration

```typescript
// Before (Google)
import { Translate } from "@google-cloud/translate/build/src/v2";
const client = new Translate();
const [translation] = await client.translate("Hello", "nl");

// After (Langbly)
import { Langbly } from "langbly";
const client = new Langbly({ apiKey: "your-key" });
const result = await client.translate("Hello", { target: "nl" });
```

## API Reference

### `new Langbly(options)`

- `apiKey` (string): Your Langbly API key
- `baseUrl` (string, optional): Override API URL (default: `https://api.langbly.com`)
- `timeout` (number, optional): Request timeout in ms (default: 30000)

### `client.translate(text, options)`

- `text` (string | string[]): Text(s) to translate
- `options.target` (string): Target language code
- `options.source` (string, optional): Source language code
- `options.format` ("text" | "html", optional): Input format

### `client.detect(text)`

- `text` (string): Text to analyze

### `client.languages(options?)`

- `options.target` (string, optional): Language code for names

## License

MIT
