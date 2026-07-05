import { cp, mkdir } from "node:fs/promises";

await mkdir("dist/http/static", { recursive: true });
await cp("src/http/static", "dist/http/static", { recursive: true });
