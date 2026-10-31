#!/usr/bin/env node
import { eligibility, listAllowedIssues, readIssue } from "./github.js";

import { readProjectStatus, readProjectStatuses } from "./projects.js";
import { buildQueue } from "./queue.js";
import { classifyLog } from "./ci-log.js";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const usage = "Usage: issuepilot issue <owner/repo> <number> | issuepilot queue <owner/repo> | issuepilot classify-log <file|->";
const repositoryPattern = /^[A-Za-z0-9_-]+\/(?!\.$|\.\.$)[A-Za-z0-9_.-]+$/;
if (args.length === 0 || (args.length === 1 && ["--help", "-h"].includes(args[0]!))) {
  console.log(usage);
  console.log("issue: reads an existing GitHub issue and reports Ready + label eligibility as JSON.");
  console.log("queue: lists open Allowed + Ready issues oldest first as JSON (read-only; exit 1 when empty).");
  console.log("classify-log: classifies a CI log file (or stdin with -) as JSON; exit 1 when the cause is unknown.");
  console.log("Authentication: GH_TOKEN/GITHUB_TOKEN; project access: PROJECT_TOKEN and PROJECT_ID.");
} else if (args.length === 2 && args[0] === "classify-log") {
  try {
    const result = classifyLog(readFileSync(args[1] === "-" ? 0 : args[1]!, "utf8"));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.category === "unknown" ? 1 : 0;
  } catch {
    console.error("Could not read or classify the log. Check the path and that the log is under 5 MB.");
    process.exitCode = 2;
  }
} else if (args.length === 2 && args[0] === "queue" && repositoryPattern.test(args[1]!)) {
  try {
    const projectId = process.env.PROJECT_ID, projectToken = process.env.PROJECT_TOKEN;
    if (!projectId || !projectToken) throw new Error('Project access configuration is missing');
    const issues = await listAllowedIssues(args[1]!, process.env.GH_TOKEN || process.env.GITHUB_TOKEN);
    const result = buildQueue(issues, await readProjectStatuses(args[1]!, projectId, projectToken));
    console.log(JSON.stringify({ Repository: args[1], Next: result.next, Queue: result.queue, Skipped: result.skipped }, null, 2));
    process.exitCode = result.next ? 0 : 1;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Project ')) console.error(error.message);
    console.error("Could not build the issue queue. Check repository, project access, rate limits and connectivity.");
    process.exitCode = 2;
  }
} else if (args.length !== 3 || args[0] !== "issue" ||
  !repositoryPattern.test(args[1]!) ||
  !/^[1-9][0-9]*$/.test(args[2]!) || !Number.isSafeInteger(Number(args[2]))) {
  console.error(usage);
  process.exitCode = 2;
} else {
  try {
    const issue = await readIssue(args[1]!, Number(args[2]), process.env.GH_TOKEN || process.env.GITHUB_TOKEN);
    let reason = eligibility(issue);
    let projectStatus: string | null = null;
    if (process.env.PROJECT_ID && process.env.PROJECT_TOKEN) {
      projectStatus = await readProjectStatus(args[1]!, Number(args[2]), process.env.PROJECT_ID, process.env.PROJECT_TOKEN);
      if (reason === 'eligible' && projectStatus !== 'Ready') reason = 'project-not-ready';
    } else if (reason === 'eligible') {
      reason = 'project-access-not-configured';
    }
    const recovering = process.env.RESUME_WORKING === 'true' && ['already-working', 'in-review'].includes(reason) &&
      ['In progress', 'In review'].includes(projectStatus ?? '');
    console.log(JSON.stringify({ Repository: args[1], Number: issue.number, Title: issue.title,
      Body: issue.body, Url: issue.html_url, Labels: issue.labels.map(label => label.name),
      ProjectStatus: projectStatus, Eligible: reason === "eligible" || recovering, Reason: recovering ? "explicit-recovery" : reason }, null, 2));
    process.exitCode = reason === "eligible" || recovering ? 0 : 1;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Project ')) console.error(error.message);
    console.error("Could not read GitHub issue. Check repository, issue/project access, rate limits and connectivity.");
    process.exitCode = 2;
  }
}
