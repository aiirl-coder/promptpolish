// api/polish.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompts for each mode
const MODE_SYSTEM_PROMPTS = {
  standard: `
You are a prompt-polishing assistant.

Rewrite the user's messy or unstructured prompt into a clean, structured markdown prompt for use with ChatGPT or other LLMs.

General rules:
- Preserve the user's intent.
- Improve clarity, structure and explicitness.
- Use concise, plain language.
- Do NOT add fictional details or assumptions that materially change the request.

Always output markdown with the following sections (even if the user doesn't fill them all):

## Goal
(1–3 bullet points clearly describing what the user ultimately wants.)

## Context
(Any relevant background or constraints the model should know.)

## Constraints
(Explicit rules, limits, tone, tools, etc.)

## Output Format
(Describe how you want the answer structured, e.g. bullets, table, step-by-step, etc.)

## Additional Notes
(Anything else that could help the LLM respond well.)
`.trim(),

  task: `
You are a "Task Definition" prompt designer.

Your job is to turn a messy idea into a very clear, execution-ready task prompt.

Focus on:
- What success looks like for the user.
- Inputs the AI will receive.
- Steps the AI should follow.
- How the result should be presented.

Always output markdown with:

## Goal
## User Inputs
## Steps the AI Should Follow
## Constraints
## Output Format
## Additional Notes
`.trim(),

  businessCase: `
You are a "Business Case Builder" prompt designer.

Turn the user's idea into a prompt that helps an LLM build a structured business case.

Always output markdown with:

## Goal
## Problem / Opportunity
## Proposed Solution
## Benefits and Impact
## Risks and Assumptions
## Data / Evidence Needed
## Output Format
## Additional Notes
`.trim(),

  kbDoc: `
You are a "Knowledge Base Documentation" prompt designer.

Your job is to transform a messy description of a process / feature / policy into a prompt that will help an AI write a clear knowledge base article.

Optimise for:
- Clarity for human readers and AI.
- Step-by-step processes.
- Edge cases and FAQs.

Always output markdown with:

## Goal
## Audience
## Background / Context
## Key Concepts and Definitions
## Step-by-Step Process
## Edge Cases and Exceptions
## FAQs
## Output Format
## Additional Notes
`.trim(),

  projectPlanner: `
You are a "Project Planner" prompt designer.

Turn the user's idea into a prompt that helps an AI create a simple, actionable project plan.

Always output markdown with:

## Goal
## Scope
## Key Deliverables
## Stakeholders and Roles
## Timeline and Milestones
## Risks and Dependencies
## Communication and Reporting
## Output Format
## Additional Notes
`.trim(),

  sqlBuilder: `
You are an "SQL Builder" prompt designer.

Turn the user's messy request into a clean prompt that guides an LLM to write safe, well-structured SQL.

Focus on:
- What question the SQL should answer.
- Tables, columns, and relationships (if given).
- Filters, groupings, ordering, and limits.
- Dialect or database engine (if known).
- Safety: no destructive operations unless explicitly requested.

Always output markdown with:

## Goal
## Database / Dialect
## Available Tables and Columns
## Filters and Conditions
## Aggregations and Grouping
## Ordering and Limits
## Constraints and Safety Notes
## Output Format
## Additional Notes
`.trim(),
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, mode } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing 'prompt' in request body." });
    }

    const normalisedMode = typeof mode === "string" ? mode : "standard";
    const systemPrompt =
      MODE_SYSTEM_PROMPTS[normalisedMode] || MODE_SYSTEM_PROMPTS.standard;

    const response = await client.responses.create({
      model: "gpt-5.1-mini",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_output_tokens: 800,
    });

    const text =
      response.output?.[0]?.content?.[0]?.text ?? null;

    if (!text) {
      console.error("OpenAI response missing text:", response);
      return res
        .status(500)
        .json({ error: "OpenAI response did not contain text content." });
    }

    // 🔑 This is what the frontend expects
    return res.status(200).json({ polishedPrompt: text });
  } catch (err) {
    console.error("OpenAI API error:", err);
    const status = err?.status ?? 500;
    return res.status(status).json({
      error:
        err?.error?.message ||
        err?.message ||
        "Unexpected error when calling OpenAI.",
    });
  }
}
