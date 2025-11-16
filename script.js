// script.js

document.addEventListener("DOMContentLoaded", () => {
  const inputEl = document.getElementById("inputPrompt");
  const outputEl = document.getElementById("outputPrompt");
  const polishButton = document.getElementById("polishButton");
  const copyButton = document.getElementById("copyButton");
  const statusMessage = document.getElementById("statusMessage");
  const modeButtons = document.querySelectorAll("[data-mode]");

  // Default mode
  let currentMode = "standard";

  // Auto-focus the messy prompt box on load
  if (inputEl) {
    inputEl.focus();
  }

  // Handle mode pill selection
  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeButtons.forEach((b) => b.classList.remove("mode-pill--active"));
      btn.classList.add("mode-pill--active");
      currentMode = btn.dataset.mode || "standard";
    });
  });

  // Main "Polish my prompt" handler
  polishButton.addEventListener("click", async () => {
    const raw = inputEl.value.trim();

    if (!raw) {
      statusMessage.textContent = "Please paste a prompt to polish.";
      return;
    }

    polishButton.disabled = true;
    statusMessage.textContent = "Polishing your prompt with AI…";

    try {
      const res = await fetch("/api/polish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: raw,
          mode: currentMode,
        }),
      });

      let data = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        console.error("Error parsing JSON from /api/polish:", parseErr);
      }

      if (!res.ok) {
        const msg =
          data?.error ||
          `The AI request failed (status ${res.status}). Please try again.`;
        statusMessage.textContent = msg;
        console.error("API error payload:", data);
        return;
      }

      if (!data || typeof data.polishedPrompt !== "string") {
        statusMessage.textContent =
          "The AI responded, but in an unexpected format.";
        console.error("Unexpected API response shape:", data);
        return;
      }

      // Success
      outputEl.value = data.polishedPrompt;
      statusMessage.textContent =
        "Done. Copy this into ChatGPT or your favourite LLM.";
    } catch (err) {
      console.error("Network/JS error talking to /api/polish:", err);
      statusMessage.textContent =
        "Something went wrong talking to the AI. Please try again.";
    } finally {
      polishButton.disabled = false;
    }
  });

  // Copy polished prompt
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
      console.error("Clipboard error:", err);
      statusMessage.textContent =
        "Could not copy automatically. Please copy manually.";
    }
  });
});
