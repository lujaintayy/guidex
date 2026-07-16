/**
 * Creates a GitHub repository via the Replit connectors proxy and
 * sets the git `origin` remote so `git push` works.
 * Run: node scripts/create-github-repo.mjs [repo-name]
 */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { execSync } from "child_process";

const connectors = new ReplitConnectors();
const repoName = process.argv[2] ?? "guidex";

// 1. Get current user
const userResp = await connectors.proxy("github", "/user", { method: "GET" });
const user = await userResp.json();
console.log(`Authenticated as: ${user.login}`);

// 2. Create the repo (ignore 422 = already exists)
const createResp = await connectors.proxy("github", "/user/repos", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: repoName,
    description: "GuideX — Enterprise DevOps Platform",
    private: false,
    auto_init: false,
  }),
});
const repo = await createResp.json();

let repoUrl;
if (repo.html_url) {
  console.log(`Repository ready: ${repo.html_url}`);
  repoUrl = repo.clone_url ?? repo.ssh_url;
} else if (repo.errors || repo.message?.includes("already exists")) {
  // Repo already exists — fetch it
  console.log("Repository already exists, fetching details...");
  const getResp = await connectors.proxy("github", `/repos/${user.login}/${repoName}`, { method: "GET" });
  const existing = await getResp.json();
  console.log(`Repository: ${existing.html_url}`);
  repoUrl = existing.clone_url ?? existing.ssh_url;
} else {
  console.error("Unexpected response:", JSON.stringify(repo));
  process.exit(1);
}

// 3. Configure git identity if not set
try { execSync("git config user.email"); } catch {
  execSync(`git config user.email "agent@replit.com"`);
  execSync(`git config user.name "Replit Agent"`);
}

// 4. Set origin remote
try {
  execSync(`git remote remove origin 2>/dev/null || true`, { stdio: "inherit" });
} catch {}
execSync(`git remote add origin ${repoUrl}`, { stdio: "inherit" });
console.log(`Set origin → ${repoUrl}`);

console.log("Done — run gitPush to push the code.");
