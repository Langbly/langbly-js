export {
  Langbly,
  LangblyError,
  RateLimitError,
  AuthenticationError,
} from "./client.js";

export type {
  LangblyOptions,
  TranslateOptions,
  Translation,
  Detection,
  Language,
} from "./client.js";

// Default export for convenience: import Langbly from 'langbly'
export { Langbly as default } from "./client.js";
