// script.js

const inputEl = document.getElementById("inputPrompt");
const outputEl = document.getElementById("outputPrompt");
const polishButton = document.getElementById("polishButton");
const copyButton = document.getElementById("copyButton");
const statusMessage = document.getElementById("statusMessage");

// Mode pills (each button should have data-mode="standard" | "task" | "business" | "kb" | "project" | "sql")
const modePills = document.querySelectorAll("[data-mode]");

let currentMode = "standard"; // default

// Focus the messy prompt box on load
window.addEventListener("load", () => {
  if (inputEl) {
    inputEl.focus();
  }
});

// Handle mode selection
modePills.forEach((pill) => {
  pill.addEventListener("click", () => {
    const mode = pill.dataset.mode || "standard";
    currentMode = mode;

    modePills.forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
  });
});

// Helper: update status text
function setStatus(message) {
  if (statusMessage) {
    statusMessage.textContent = message;
  }
}

// Handle "Polish my prompt"
polishButton.addEventListener("click", async () => {
  const raw = (inputEl.value || "").trim();

  if (!raw) {
    setStatus("Please paste a prompt to polish.");
    inputEl.focus();
    return;
  }

  outputEl.value = "";
  setStatus("Asking the AI to polish your prompt…");

  try {
    const response = await fetch("/api/polish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rawPrompt: raw,
        mode: currentMode, // e.g. "standard", "task", "business", "kb", "project", "sql"
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        data && data.error
          ? data.error
          : `The AI request failed (status ${response.status}). Please try again.`;
      setStatus(errorMessage);
      return;
    }

    if (!data || !data.polished) {
      setStatus("The AI responded, but in an unexpected format.");
      console.error("Unexpected response from /api/polish:", data);
      return;
    }

    outputEl.value = data.polished;
    setStatus("Done! Your polished prompt is ready.");
  } catch (err) {
    console.error("Network / JS error calling /api/polish:", err);
    setStatus("Something went wrong talking to the AI. Please try again.");
  }
});

// Handle "Copy polished prompt"
copyButton.addEventListener("click", async () => {
  const text = (outputEl.value || "").trim();

  if (!text) {
    setStatus("Nothing to copy yet.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setStatus("Copied polished prompt to clipboard ✔");
  } catch (err) {
    console.error("Clipboard error:", err);
    setStatus("Could not copy. Please copy manually.");
  }
});
