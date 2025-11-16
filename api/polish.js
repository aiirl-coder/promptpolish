import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messyPrompt, mode } = req.body;

    if (!messyPrompt) {
      return res.status(400).json({ error: "Missing messyPrompt" });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // System prompt that guarantees structured markdown output
    const systemPrompt = `
You are PromptPolish, an expert at rewriting messy prompts into clean, structured, copy-ready prompts.

You must ALWAYS return valid Markdown following this structure:

## Goal
- Clear bullets describing the user's intent

## Context
- Bullets capturing any relevant details

## Constraints
- Any limitations or requirements

## Output Format
- Describe how the assistant should format its answer

## Additional Notes
- Anything extra that is helpful

If the user selects a mode, apply its template:

STANDARD POLISH → clean the prompt normally  
TASK DEFINITION → clarify tasks, success criteria, inputs, outputs  
BUSINESS CASE BUILDER → goals, problem, impact, metrics, stakeholders  
KNOWLEDGE BASE DOC → audience, purpose, structure, inclusions/exclusions  
PROJECT PLANNER → goals, steps, dependencies, risks, timeline  
SQL BUILDER → objective, tables, fields, constraints, expected output format  
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `MODE = ${mode}\n\nUSER PROMPT:\n${messyPrompt}` }
      ]
    });

    let polished = response.output_text;

    return res.status(200).json({ polished });

  } catch (err) {
    console.error("API ERROR →", err);

    return res.status(500).json({
      error: "OpenAI API call failed",
      details: err.message || err.response || "Unknown error"
    });
  }
}
