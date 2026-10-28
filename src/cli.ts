#!/usr/bin/env node
import { eligibility, readIssue } from "./github.js";

import { readProjectStatus } from "./projects.js";

const args = process.argv.slice(2);
const usage = "Usage: issuepilot issue <owner/repo> <number>";
if (args.length === 0 || (args.length === 1 && ["--help", "-h"].includes(args[0]!))) {
  console.log(usage);
  console.log("Reads an existing GitHub issue and reports Ready + label eligibility as JSON.");
  console.log("Authentication: GH_TOKEN/GITHUB_TOKEN; project access: PROJECT_TOKEN and PROJECT_ID.");
} else if (args.length !== 3 || args[0] !== "issue" ||
  !/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(args[1]!) ||
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
    console.log(JSON.stringify({ Repository: args[1], Number: issue.number, Title: issue.title,
      Body: issue.body, Url: issue.html_url, Labels: issue.labels.map(label => label.name),
      ProjectStatus: projectStatus, Eligible: reason === "eligible", Reason: reason }, null, 2));
    process.exitCode = reason === "eligible" ? 0 : 1;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Project ')) console.error(error.message);
    console.error("Could not read GitHub issue. Check repository, issue/project access, rate limits and connectivity.");
    process.exitCode = 2;
  }
}
