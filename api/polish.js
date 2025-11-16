// api/polish.js
// Vercel serverless function to call the OpenAI Chat Completions API
// and turn a messy prompt into a structured markdown prompt.

const MODEL = "gpt-5.1-mini"; // You can change this to any chat model you prefer.

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY environment variable");
    return res
      .status(500)
      .json({ error: "Server misconfigured: missing OpenAI API key." });
  }

  // Parse request body
  let promptText = "";
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    promptText = (body && body.prompt) || "";
  } catch (err) {
    console.error("Error parsing request body:", err);
    return res.status(400).json({ error: "Invalid JSON in request body." });
  }

  if (!promptText.trim()) {
    return res.status(400).json({ error: "Missing 'prompt' in request body." });
  }

  // Optional: basic length guardrail
  const MAX_CHARS = 6000;
  if (promptText.length > MAX_CHARS) {
    promptText = promptText.slice(0, MAX_CHARS);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You are PromptPolish, a tool that rewrites messy user prompts into clear, structured markdown prompts for large language models. " +
              "Preserve the user's intent and important details, but improve clarity, remove redundancy, and add structure. " +
              "Always respond ONLY with markdown in the following sections and nothing else:\n\n" +
              "## Goal\n" +
              "## Context\n" +
              "## Constraints\n" +
              "## Output Format\n" +
              "## Additional Notes\n\n" +
              "Under each heading, write concise bullet points or short paragraphs. Do not explain what you are doing. Do not add commentary about PromptPolish.",
          },
          {
            role: "user",
            content: promptText,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return res.status(500).json({
        error: "OpenAI API request failed.",
      });
    }

    const data = await response.json();
    const content =
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content;

    if (!content) {
      console.error("No content in OpenAI response:", data);
      return res
        .status(500)
        .json({ error: "
