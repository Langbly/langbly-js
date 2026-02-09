/**
 * Langbly — Official JavaScript/TypeScript SDK for the Langbly translation API.
 *
 * A drop-in replacement for Google Translate v2 — powered by LLMs.
 */

export interface LangblyOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  /** Number of retries for transient errors (429, 5xx). Default: 2. */
  maxRetries?: number;
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

export class RateLimitError extends LangblyError {
  retryAfter: number | null;

  constructor(message: string, retryAfter: number | null = null) {
    super(message, 429, "RATE_LIMITED");
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class AuthenticationError extends LangblyError {
  constructor(message: string) {
    super(message, 401, "UNAUTHENTICATED");
    this.name = "AuthenticationError";
  }
}

const RETRIABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export class Langbly {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;

  constructor(options: LangblyOptions) {
    if (!options.apiKey) {
      throw new Error("apiKey is required");
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? "https://api.langbly.com").replace(
      /\/$/,
      ""
    );
    this.timeout = options.timeout ?? 30_000;
    this.maxRetries = options.maxRetries ?? 2;
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

    const data = await this.postWithRetry("/language/translate/v2", body);

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
    const data = await this.postWithRetry("/language/translate/v2/detect", {
      q: text,
    });
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

    const resp = await this.fetchWithRetry(`${this.baseUrl}${url}`, {
      method: "GET",
    });
    const data = await resp.json();

    return data.data.languages.map(
      (lang: Record<string, string>) => ({
        code: lang.language,
        name: lang.name,
      })
    );
  }

  private async postWithRetry(
    path: string,
    body: unknown
  ): Promise<Record<string, any>> {
    const resp = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return resp.json();
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "User-Agent": "langbly-js/0.1.0",
      ...(init.headers as Record<string, string>),
    };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      let resp: Response;

      try {
        resp = await fetch(url, {
          ...init,
          headers,
          signal: AbortSignal.timeout(this.timeout),
        });
      } catch (err) {
        // Network error or timeout
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.maxRetries) {
          await this.sleep(this.backoffDelay(attempt));
          continue;
        }
        throw new LangblyError(
          `Request failed after ${this.maxRetries + 1} attempts: ${lastError.message}`,
          0,
          "CONNECTION_ERROR"
        );
      }

      if (resp.ok) {
        return resp;
      }

      // Non-retriable error — throw immediately
      if (!RETRIABLE_STATUS_CODES.has(resp.status)) {
        await this.throwForStatus(resp);
      }

      // Retriable error — retry if we have attempts left
      if (attempt < this.maxRetries) {
        const delay = this.getRetryDelay(resp, attempt);
        await this.sleep(delay);
        continue;
      }

      // Final attempt failed
      await this.throwForStatus(resp);
    }

    // Should not reach here
    throw lastError ?? new LangblyError("Request failed");
  }

  private async throwForStatus(resp: Response): Promise<never> {
    let message = resp.statusText;
    let code = "";
    try {
      const err = await resp.json();
      message = err?.error?.message ?? message;
      code = err?.error?.status ?? "";
    } catch {
      // ignore parse errors
    }

    if (resp.status === 401) {
      throw new AuthenticationError(message);
    }
    if (resp.status === 429) {
      const retryAfter = this.parseRetryAfter(resp);
      throw new RateLimitError(message, retryAfter);
    }

    throw new LangblyError(message, resp.status, code);
  }

  private parseRetryAfter(resp: Response): number | null {
    const header = resp.headers.get("retry-after");
    if (!header) return null;
    const value = Number(header);
    return Number.isFinite(value) ? value : null;
  }

  private getRetryDelay(resp: Response, attempt: number): number {
    const retryAfter = resp.headers.get("retry-after");
    if (retryAfter) {
      const value = Number(retryAfter);
      if (Number.isFinite(value)) {
        return Math.min(value * 1000, 30_000);
      }
    }
    return Math.min(500 * 2 ** attempt, 10_000);
  }

  private backoffDelay(attempt: number): number {
    return Math.min(500 * 2 ** attempt, 10_000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
