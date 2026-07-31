import { existsSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import { spawnSync } from "node:child_process";

let input = {};
try {
  input = JSON.parse(await new Promise((resolveInput) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolveInput(data || "{}"));
  }));
} catch {
  process.exit(0);
}

let cwd = resolve(typeof input.cwd === "string" ? input.cwd : process.cwd());
let projectRoot;

while (true) {
  if (existsSync(join(cwd, ".wq"))) {
    projectRoot = cwd;
    break;
  }
  const parent = dirname(cwd);
  if (parent === cwd || cwd === parse(cwd).root) break;
  cwd = parent;
}

if (!projectRoot) process.exit(0);

const result = spawnSync("wq prime", {
  cwd: projectRoot,
  encoding: "utf8",
  shell: true,
  timeout: 25_000,
  windowsHide: true,
});

if (result.error || result.status !== 0) {
  const detail = (result.stderr || result.error?.message || "unknown error").trim();
  process.stdout.write(JSON.stringify({
    systemMessage: `wq-prime could not run in ${projectRoot}: ${detail}`,
  }));
  process.exit(0);
}

process.stdout.write(result.stdout);
