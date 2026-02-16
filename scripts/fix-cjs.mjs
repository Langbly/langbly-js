// Post-build script: add package.json to CJS output so Node treats .js as CommonJS
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cjsDir = join(__dirname, "..", "dist", "cjs");

writeFileSync(
  join(cjsDir, "package.json"),
  JSON.stringify({ type: "commonjs" }, null, 2) + "\n"
);

console.log("Created dist/cjs/package.json with type: commonjs");
