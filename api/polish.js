import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Different polishing modes
const MODE_CONFIG = {
  standard: {
    label: "Standard Polish",
    instructions: `
You take a messy user prompt and turn it into a clean, copy-ready prompt.

Output a markdown prompt with these headings:

## Goal
## Context
## Constraints
## Output format
## Additional notes

Fill in each section clearly and concisely. Infer reasonable structure where needed, but do not invent facts that contradict the user's text.`,
  },
  task: {
    label: "Task Definition",
    instructions: `
Turn the messy user text into a clear task brief for an AI assistant.

Output a markdown prompt with:

## Task
## Inputs
## Outputs
## Steps
## Constraints
## Definition of done`,
  },
  business: {
    label: "Business Case Builder",
    instructions: `
Turn the messy user text into a structured business case.

Output a markdown prompt with:

## Problem / Opportunity
## Desired outcome
## Proposed solution
## Benefits and impact
## Risks and assumptions
## Success metrics
## Constraints and dependencies`,
  },
  kb: {
    label: "Knowledge Base Doc",
    instructions: `
Turn the messy user text into a knowledge-base style article prompt.

Output a markdown prompt with:

## Article title
## Audience
## Purpose
## Preconditions / prerequisites
## Step-by-step process
## Edge cases and FAQs
## Examples / notes`,
  },
  project: {
    label: "Project Planner",
    instructions: `
Turn the messy user text into a project planning prompt.

Output a markdown prompt with:

## Objective
## Scope
## Deliverables
## Milestones & timeline
## Roles & stakeholders
## Risks & mitigations
## Success criteria`,
  },
  sql: {
    label: "SQL Builder",
    instructions: `
Turn the messy user text into a prompt that will guide an LLM to write SQL.

Output a markdown prompt with:

## Goal
## Source tables and relevant columns
## Filters and conditions
## Joins
## Aggregations & groupings
## Output columns, ordering & limits
## Edge cases and data quality notes

Make sure the instructions are precise about tables, columns, filters, and expected output.`,
  },
};

const BASE_INSTRUCTIONS = `
You are PromptPolish, a prompt-engineering assistant.
You NEVER answer the user's question directly.
Instead, you rewrite their messy text into a structured prompt for another LLM.
Use clear English, concise bullet points where helpful, and markdown headings as requested.
`;

// Vercel/Next.js API route
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Safely parse body (Vercel sometimes gives string, sometimes object)
  let body = req.body;
  if (!body || typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch (err) {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  const { rawPrompt, mode } = body || {};

  if (!rawPrompt || typeof rawPrompt !== "string") {
    return res.status(400).json({ error: "Missing rawPrompt in request body" });
  }

  const modeKey = MODE_CONFIG[mode] ? mode : "standard";
  const config = MODE_CONFIG[modeKey];

  const systemMessage = `
${BASE_INSTRUCTIONS}

Current mode: ${config.label}.
${config.instructions}
`.trim();

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", // cheap, good general model
      temperature: 0.4,
      messages: [
        { role: "system", content: systemMessage },
        {
          role: "user",
          content: `Here is the messy user prompt. Rewrite it as instructed.\n\n${rawPrompt}`,
        },
      ],
    });

    const polished =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I couldn't generate a polished prompt.";

    return res.status(200).json({ polished });
  } catch (err) {
    // Log as much as possible for debugging in Vercel logs
    console.error("OpenAI API error:", err?.response?.data || err);

    const status =
      err?.status ||
      err?.response?.status ||
      500;

    const details =
      err?.response?.data?.error?.message ||
      err?.message ||
      "Unknown error from OpenAI";

    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: "OpenAI API error",
      details,
    });
  }
}
