import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const readStdin = () => new Promise(ok => {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", chunk => { data += chunk; });
  process.stdin.on("end", () => ok(data));
});
const emit = (message, block = false) => {
  const output = block ? { decision: "block", reason: message }
    : { hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: message } };
  process.stdout.write(JSON.stringify(output));
};
const command = (name, args, options = {}) => spawnSync(name, args, {
  encoding: "utf8", windowsHide: true, shell: process.platform === "win32" && ["wq", "codex"].includes(name), ...options,
});
const output = result => {
  if (result.error || result.status !== 0) throw new Error((result.stderr || result.error?.message || `exit ${result.status}`).trim());
  return result.stdout.trim();
};
const findProject = start => {
  let dir = resolve(start);
  while (true) {
    if (existsSync(join(dir, ".wq"))) return dir;
    const parent = dirname(dir);
    if (parent === dir || dir === parse(dir).root) return undefined;
    dir = parent;
  }
};
const codexExecutable = () => {
  if (process.platform !== "win32") return "codex";
  const root = process.env.CODEX_HOME || join(homedir(), ".codex");
  for (const dir of [join(root, "plugins", ".plugin-appserver"), join(root, ".sandbox-bin")]) {
    const executable = join(dir, "codex.exe");
    if (existsSync(executable) && existsSync(join(dir, "codex-code-mode-host.exe"))) return executable;
  }
  return "codex";
};

let input;
try { input = JSON.parse(await readStdin() || "{}"); } catch { process.exit(0); }
if (input.hook_event_name !== "PostToolUse") process.exit(0);
const project = findProject(typeof input.cwd === "string" ? input.cwd : process.cwd());
if (!project) process.exit(0);
const wqd = join(project, ".wq"), reviewFile = join(wqd, "REVIEW.md");
if (!existsSync(reviewFile)) process.exit(0);

const lockFile = join(wqd, "REVIEW.lock");
let lock;
for (let attempt = 0; attempt < 2 && lock === undefined; attempt++) {
  try {
    lock = openSync(lockFile, "wx");
    writeFileSync(lock, String(process.pid));
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const pid = Number(readFileSync(lockFile, "utf8"));
    if (Number.isSafeInteger(pid) && pid > 0) {
      try { process.kill(pid, 0); process.exit(0); }
      catch (killError) { if (killError.code !== "ESRCH") process.exit(0); }
    }
    rmSync(lockFile, { force: true });
  }
}
if (lock === undefined) process.exit(0);

const wq = (args, env = process.env) => command("wq", args, { cwd: project, env });
const transition = (ids, status) => output(wq(["update", ...ids.map(String), `--status=${status}`], { ...process.env, WQ_OVERRIDE_VALIDATION: "1" }));
class HookDone extends Error {}
const done = () => { throw new HookDone(); };
let runDir, checkout;
try {
  const submitted = JSON.parse(output(wq(["list", "--status=submitted"])) || "[]");
  if (!Array.isArray(submitted) || submitted.length === 0) done();
  const taskIds = submitted.map(item => item.id), label = taskIds.map(id => `#${id}`).join(", ");
  if (submitted.some(item => item.type !== "task")) {
    transition(taskIds, "claimed");
    emit(`wq review refused an invalid submitted set; returned ${submitted.length} item(s) to claimed.`, true);
    done();
  }

  const tasks = JSON.parse(output(wq(["show", ...taskIds.map(String)])));
  const invalid = tasks.find(task => !Array.isArray(task.links?.satisfies) || task.links.satisfies.length === 0 || task.links.satisfies.some(item => item.type !== "requirement"));
  if (invalid) {
    transition(taskIds, "claimed");
    emit(`wq review rejected batch ${label}: #${invalid.id} does not satisfy at least one requirement or satisfies a non-requirement.`, true);
    done();
  }
  const requirementIds = [...new Set(tasks.flatMap(task => task.links.satisfies.map(item => item.id)))];
  const requirements = JSON.parse(output(wq(["show", ...requirementIds.map(String)])));
  const head = output(command("git", ["rev-parse", "HEAD"], { cwd: project }));
  const status = output(command("git", ["status", "--porcelain", "--", ".", ":(exclude).wq", ":(exclude).wq/**"], { cwd: project }));
  if (status) {
    transition(taskIds, "claimed");
    emit(`wq review rejected batch ${label}: the worker checkout has uncommitted changes, so no complete revision can be reviewed.`, true);
    done();
  }

  const pluginRoot = process.env.PLUGIN_ROOT || resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const dataRoot = resolve(process.env.PLUGIN_DATA || join(tmpdir(), "wq-review"));
  mkdirSync(dataRoot, { recursive: true });
  runDir = mkdtempSync(join(dataRoot, "run-"));
  checkout = join(runDir, "repo");
  output(command("git", ["worktree", "add", "--detach", checkout, head], { cwd: project }));

  const agentsFile = join(project, "AGENTS.md");
  const revision = output(command("git", ["rev-list", "--parents", "-n", "1", head], { cwd: project })).split(" ");
  const packet = {
    schema_version: 2,
    tasks,
    requirements,
    revision: {
      commit: head,
      parent: revision[1] || null,
      changed_files: output(command("git", ["diff-tree", "--root", "--no-commit-id", "--name-only", "-r", head], { cwd: project })).split(/\r?\n/).filter(Boolean),
    },
    repository_instructions: existsSync(agentsFile) ? readFileSync(agentsFile, "utf8") : null,
  };
  const prompt = `${readFileSync(reviewFile, "utf8")}\n\n# frozen review packet\n\n${JSON.stringify(packet, null, 2)}`;
  const resultFile = join(runDir, "result.json");
  const childEnv = { ...process.env };
  for (const name of ["WQ_OVERRIDE_VALIDATION", "PLUGIN_ROOT", "PLUGIN_DATA", "CLAUDE_PLUGIN_ROOT", "CLAUDE_PLUGIN_DATA"]) delete childEnv[name];
  const sandboxConfig = process.platform === "win32"
    ? ["-c", "sandbox_mode=\"workspace-write\"", "-c", "windows.sandbox=\"elevated\""] : [];
  const reviewRun = command(codexExecutable(), [
    "exec", "--ignore-user-config", "--ignore-rules", "-c", "features.hooks=false",
    ...sandboxConfig, "--ephemeral", "--color", "never",
    "--sandbox", "workspace-write", "--output-schema", join(pluginRoot, "scripts", "review.schema.json"),
    "--output-last-message", resultFile, "-",
  ], { cwd: checkout, env: childEnv, input: prompt, timeout: 3_500_000, maxBuffer: 16 * 1024 * 1024 });
  output(reviewRun);
  const review = JSON.parse(readFileSync(resultFile, "utf8"));
  const accepted = review.verdict === "pass";
  transition(taskIds, accepted ? "closed" : "claimed");
  const message = `wq review ${accepted ? "passed" : "returned"} batch ${label} ${accepted ? "and closed it" : "to claimed"}:\n${JSON.stringify(review, null, 2)}`;
  emit(message, !accepted);
} catch (error) {
  if (!(error instanceof HookDone)) {
    let suffix = "";
    try {
      const submitted = JSON.parse(output(wq(["list", "--status=submitted"])) || "[]");
      if (submitted.length) transition(submitted.map(item => item.id), "claimed");
      if (submitted.length) suffix = " Submitted work was returned to claimed.";
    } catch (transitionError) { suffix = ` Could not return submitted work to claimed: ${transitionError.message}`; }
    emit(`wq review failed: ${error.message}.${suffix}`, true);
  }
} finally {
  if (checkout && existsSync(checkout)) command("git", ["worktree", "remove", "--force", checkout], { cwd: project });
  if (runDir) rmSync(runDir, { recursive: true, force: true });
  closeSync(lock);
  try { unlinkSync(lockFile); } catch { /* best-effort cleanup */ }
}
