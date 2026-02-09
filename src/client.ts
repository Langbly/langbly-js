/**
 * Langbly — Official JavaScript/TypeScript SDK for the Langbly translation API.
 *
 * A drop-in replacement for Google Translate v2 — powered by LLMs.
 */

export interface LangblyOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface TranslateOptions {
  target: string;
  source?: string;
  format?: "text" | "html";
}

export interface Translation {
  text: string;
  source: string;
  model?: string;
}

export interface Detection {
  language: string;
  confidence: number;
}

export interface Language {
  code: string;
  name?: string;
}

export class LangblyError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number = 0, code: string = "") {
    super(message);
    this.name = "LangblyError";
    this.status = status;
    this.code = code;
  }
}

export class Langbly {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(options: LangblyOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? "https://api.langbly.com").replace(
      /\/$/,
      ""
    );
    this.timeout = options.timeout ?? 30_000;
  }

  /**
   * Translate text to the target language.
   */
  async translate(
    text: string,
    options: TranslateOptions
  ): Promise<Translation>;
  async translate(
    text: string[],
    options: TranslateOptions
  ): Promise<Translation[]>;
  async translate(
    text: string | string[],
    options: TranslateOptions
  ): Promise<Translation | Translation[]> {
    const q = Array.isArray(text) ? text : [text];

    const body: Record<string, unknown> = { q, target: options.target };
    if (options.source) body.source = options.source;
    if (options.format) body.format = options.format;

    const data = await this.post("/language/translate/v2", body);

    const translations: Translation[] = data.data.translations.map(
      (item: Record<string, string>) => ({
        text: item.translatedText,
        source: item.detectedSourceLanguage ?? options.source ?? "",
        model: item.model,
      })
    );

    return Array.isArray(text) ? translations : translations[0];
  }

  /**
   * Detect the language of text.
   */
  async detect(text: string): Promise<Detection> {
    const data = await this.post("/language/translate/v2/detect", { q: text });
    const det = data.data.detections[0][0];
    return {
      language: det.language,
      confidence: det.confidence ?? 0,
    };
  }

  /**
   * List supported languages.
   */
  async languages(options?: { target?: string }): Promise<Language[]> {
    const params = new URLSearchParams();
    if (options?.target) params.set("target", options.target);
    const qs = params.toString();
    const url = `/language/translate/v2/languages${qs ? `?${qs}` : ""}`;

    const resp = await fetch(`${this.baseUrl}${url}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(this.timeout),
    });

    await this.check(resp);
    const data = await resp.json();

    return data.data.languages.map(
      (lang: Record<string, string>) => ({
        code: lang.language,
        name: lang.name,
      })
    );
  }

  private async post(path: string, body: unknown): Promise<Record<string, any>> {
    const resp = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    });

    await this.check(resp);
    return resp.json();
  }

  private async check(resp: Response): Promise<void> {
    if (resp.ok) return;
    let message = resp.statusText;
    let code = "";
    try {
      const err = await resp.json();
      message = err?.error?.message ?? message;
      code = err?.error?.status ?? "";
    } catch {
      // ignore parse errors
    }
    throw new LangblyError(message, resp.status, code);
  }
}
