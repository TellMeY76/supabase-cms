import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(dirname(fileURLToPath(import.meta.url)));
const standaloneAppDir = join(appDir, ".next", "standalone", "apps", "site");
const staticSource = join(appDir, ".next", "static");
const staticTarget = join(standaloneAppDir, ".next", "static");
const publicSource = join(appDir, "public");
const publicTarget = join(standaloneAppDir, "public");

if (!existsSync(standaloneAppDir)) {
  throw new Error("Missing Next standalone output. Ensure next.config has output: 'standalone'.");
}

if (existsSync(staticTarget)) rmSync(staticTarget, { recursive: true, force: true });
cpSync(staticSource, staticTarget, { recursive: true });

if (existsSync(publicSource)) {
  if (existsSync(publicTarget)) rmSync(publicTarget, { recursive: true, force: true });
  cpSync(publicSource, publicTarget, { recursive: true });
}
