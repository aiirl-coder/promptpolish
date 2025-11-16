const inputEl = document.getElementById("inputPrompt");
const outputEl = document.getElementById("outputPrompt");
const polishButton = document.getElementById("polishButton");
const copyButton = document.getElementById("copyButton");
const statusMessage = document.getElementById("statusMessage");

polishButton.addEventListener("click", () => {
  const raw = inputEl.value.trim();

  if (!raw) {
    statusMessage.textContent = "Please paste a prompt to polish.";
    return;
  }

  statusMessage.textContent = "Polishing (dummy mode)…";

  // Dummy transformation for now
  const polished = `## Goal

Describe clearly what you want:

${raw}

---

## Additional context

(Add any extra details here.)

## Output format

(Describe how you want the answer structured.)`;

  outputEl.value = polished;
  statusMessage.textContent = "Done (this is a fake polish – real AI coming soon).";
});

copyButton.addEventListener("click", async () => {
  const text = outputEl.value.trim();
  if (!text) {
    statusMessage.textContent = "Nothing to copy yet.";
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    statusMessage.textContent = "Copied polished prompt to clipboard ✔";
  } catch (err) {
    console.error(err);
    statusMessage.textContent = "Could not copy. Please copy manually.";
  }
});
