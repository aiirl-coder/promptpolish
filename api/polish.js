// api/polish.js

// Map of modes → short instruction + preferred headings
const MODE_CONFIG = {
  standard: {
    label: "Standard Polish",
    system: `You are PromptPolish, a tool that rewrites messy user prompts into clean, copy-ready prompts for LLMs.

Rules:
- Keep the user’s intent exactly the same.
- Remove fluff and repetition.
- Add structure with clear markdown headings and bullet points.
- Add clarifying questions only if absolutely necessary.
- Keep it concise but powerful.`,

    headings: [
      "## Goal",
      "## Context",
      "## Constraints",
      "## Output format",
    ],
  },

  task: {
    label: "Task Definition",
    system: `You are PromptPolish, specialising in turning vague requests into crystal-clear tasks for an AI assistant.

Rules:
- Convert the user input into a clear, actionable task description.
- Identify the primary objective and key sub-tasks.
- Clarify inputs, outputs, constraints, and success criteria.
- Use markdown headings and bullet points.
- Do NOT write the final answer to the task; only define the task for the LLM.`,

    headings: [
      "## Primary objective",
      "## Sub-tasks",
      "## Inputs & assumptions",
      "## Constraints",
      "## Definition of done",
    ],
  },

  business: {
    label: "Business Case Builder",
    system: `You are PromptPolish, specialising in business case prompts.

Rules:
- Turn the user input into a structured business case brief for an LLM.
- Include problem, opportunity, options, benefits, risks, and required outputs.
- Use markdown headings and bullet points.
- Do NOT write the actual business case; only the prompt that asks the LLM to do so.`,

    headings: [
      "## Problem / opportunity",
      "## Objectives",
      "## Options to consider",
      "## Benefits & value",
      "## Risks & dependencies",
      "## Required output",
    ],
  },

  kb: {
    label: "Knowledge Base Documentation",
    system: `You are PromptPolish, specialising in knowledge base documentation prompts.

Rules:
- Turn the user’s messy notes into a clean prompt that instructs an LLM to write a KB article.
- Emphasise audience, purpose, prerequisites, steps, and troubleshooting.
- Use markdown headings and bullet points.
- Do NOT write the actual article; only the prompt that asks the LLM to do so.`,

    headings: [
      "## Article goal & audience",
      "## Context / background",
      "## Preconditions / prerequisites",
      "## Key steps or process",
      "## Edge cases",
      "## Troubleshooting",
      "## Required output style",
    ],
  },

  project: {
    label: "Project Planner",
    system: `You are PromptPolish, specialising in project planning prompts.

Rules:
- Turn the user input into a project-planning prompt for an LLM.
- Capture scope, goals, stakeholders, milestones, risks, and outputs.
- Use markdown headings and bullet points.
- Do NOT plan the project yourself; only define the prompt.`,

    headings: [
      "## Project goal",
      "## Scope & boundaries",
      "## Stakeholders",
      "## Key milestones",
      "## Risks & dependencies",
      "## Required output",
    ],
  },

  sql: {
    label: "SQL Builder",
    system: `You are PromptPolish, specialising in prompts that help LLMs generate SQL.

Rules:
- Turn the user’s description of the data problem into a precise SQL-builder prompt.
- Capture tables, columns, relationships, filters, aggregations, edge cases, and output format.
- Encourage the LLM to ask for missing schema details if needed.
- Use markdown headings and bullet points.
- Do NOT write SQL yourself; only craft the prompt that tells the LLM how to write the SQL.`,

    headings: [
      "## Goal",
      "## Available tables & columns",
      "## Filters & conditions",
      "## Aggregations / grouping",
      "## Edge cases / data quality",
      "## Output format",
    ],
  },
};

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  try {
    // --- Parse JSON body safely (Node serverless doesn't do this for us) ---
    let rawBody = "";
    for await (const chunk of req) {
      rawBody += chunk;
    }

    let body = {};
    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch (e) {
        console.error("Failed to parse JSON body:", e, rawBody);
        throw new Error("Invalid JSON body");
      }
    }

    const { rawPrompt, mode } = body || {};

    if (!rawPrompt || typeof rawPrompt !== "string") {
      throw new Error("Missing or invalid 'rawPrompt' in request body.");
    }

    const modeKey = mode || "standard";
    const config = MODE_CONFIG[modeKey];

    if (!config) {
      throw new Error(`Unknown mode '${modeKey}'.`);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set in environment variables on Vercel."
      );
    }

    // Build the system prompt for this mode
    const systemPrompt = `${config.system}

Always structure your final answer using these markdown headings (only if they make sense):

${config.headings.join("\n")}

Return ONLY the polished prompt. Do not add commentary or notes outside the prompt.`;

    // --- Call OpenAI Responses API ---
    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: rawPrompt,
          },
        ],
      }),
    });

    const data = await openaiRes.json().catch(() => ({}));

    if (!openaiRes.ok) {
      console.error("OpenAI API error:", openaiRes.status, data);
      res.statusCode = openaiRes.status || 500;
      res.setHeader("Content-Type", "application/json");
      return res.end(
        JSON.stringify({
          error:
            data?.error?.message ||
            `OpenAI API error (status ${openaiRes.status})`,
        })
      );
    }

    // Extract the text from the Responses API shape
    const polished =
      data?.output?.[0]?.content?.[0]?.text ||
      data?.output_text ||
      "";

    if (!polished) {
      console.error("Unexpected OpenAI response shape:", data);
      throw new Error("The AI responded, but in an unexpected format.");
    }

    // Success
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ polished }));
  } catch (err) {
    console.error("polish handler crashed:", err);

    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        error:
          err && err.message
            ? err.message
            : "Unexpected server error in /api/polish.",
      })
    );
  }
}
