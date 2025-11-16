const inputEl = document.getElementById("inputPrompt");
const outputEl = document.getElementById("outputPrompt");
const polishButton = document.getElementById("polishButton");
const copyButton = document.getElementById("copyButton");
const statusMessage = document.getElementById("statusMessage");
const modePills = document.querySelectorAll(".mode-pill");

let selectedMode = "standard";

/* AUTO-FOCUS THE MESSY PROMPT BOX ON PAGE LOAD */
window.addEventListener("load", () => {
  if (inputEl) {
    inputEl.focus();
    inputEl.select(); // highlight any existing text
  }
});

// Mode pill behaviour
modePills.forEach((pill) => {
  pill.addEventListener("click", () => {
    selectedMode = pill.dataset.mode || "standard";

    modePills.forEach((btn) => {
      const isActive = btn === pill;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-checked", isActive ? "true" : "false");
    });
  });
});

// Helper to display status text
function setStatus(message) {
  if (statusMessage) {
    statusMessage.textContent = message;
  }
}

// Call the API to polish the prompt
polishButton.addEventListener("click", async () => {
  const raw = inputEl.value.trim();

  if (!raw) {
    setStatus("Please paste a prompt to polish.");
    return;
  }

  setStatus("Polishing your prompt with AI…");
  polishButton.disabled = true;
  outputEl.value = "";

  try {
    const response = await fetch("/api/polish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: raw,
        mode: selectedMode,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("API error:", response.status, text);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("API response:", data);

    // Accept multiple possible shapes from the backend
    const polishedText =
      (data && (data.polished || data.polishedPrompt || data.output)) || "";

    if (polishedText) {
      outputEl.value = polishedText;
      setStatus("Done ✔ Your prompt is polished.");
    } else {
      console.error("Unexpected API response shape:", data);
      setStatus("The AI responded, but in an unexpected format.");
    }
  } catch (err) {
    console.error(err);
    setStatus("Something went wrong talking to the AI. Please try again.");
  } finally {
    polishButton.disabled = false;
  }
});

// Copy polished text
copyButton.addEventListener("click", async () => {
  const text = outputEl.value.trim();
  if (!text) {
    setStatus("Nothing to copy yet.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setStatus("Copied polished prompt to clipboard ✔");
  } catch (err) {
    console.error(err);
    setStatus("Could not copy. Please copy manually.");
  }
});
