#!/usr/bin/env node
import { eligibility, readIssue } from "./github.js";

const args = process.argv.slice(2);
const usage = "Usage: issuepilot issue <owner/repo> <number>";
if (args.length === 0 || (args.length === 1 && ["--help", "-h"].includes(args[0]!))) {
  console.log(usage);
  console.log("Reads an existing GitHub issue and reports eligibility as JSON.");
  console.log("Optional authentication: GH_TOKEN or GITHUB_TOKEN.");
} else if (args.length !== 3 || args[0] !== "issue" ||
  !/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(args[1]!) ||
  !/^[1-9][0-9]*$/.test(args[2]!) || !Number.isSafeInteger(Number(args[2]))) {
  console.error(usage);
  process.exitCode = 2;
} else {
  try {
    const issue = await readIssue(args[1]!, Number(args[2]), process.env.GH_TOKEN || process.env.GITHUB_TOKEN);
    const reason = eligibility(issue);
    console.log(JSON.stringify({ Repository: args[1], Number: issue.number, Title: issue.title,
      Body: issue.body, Url: issue.html_url, Labels: issue.labels.map(label => label.name),
      Eligible: reason === "eligible", Reason: reason }, null, 2));
    process.exitCode = reason === "eligible" ? 0 : 1;
  } catch {
    console.error("Could not read GitHub issue. Check repository, access, rate limits and connectivity.");
    process.exitCode = 2;
  }
}
