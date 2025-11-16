const inputEl = document.getElementById("inputPrompt");
const outputEl = document.getElementById("outputPrompt");
const polishButton = document.getElementById("polishButton");
const copyButton = document.getElementById("copyButton");
const statusMessage = document.getElementById("statusMessage");

function setLoading(isLoading) {
  polishButton.disabled = isLoading;
  polishButton.textContent = isLoading ? "Polishing…" : "Polish my prompt";
}

async function callPolishAPI(rawPrompt) {
  const response = await fetch("/api/polish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt: rawPrompt }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const msg = data.error || "Unknown error from server.";
    throw new Error(msg);
  }

  const data = await response.json();
  return data.polishedPrompt;
}

polishButton.addEventListener("click", async () => {
  const raw = inputEl.value.trim();

  if (!raw) {
    statusMessage.textContent = "Please paste a prompt to polish.";
    return;
  }

  setLoading(true);
  statusMessage.textContent = "Calling PromptPolish AI…";

  try {
    const polished = await callPolishAPI(raw);
    outputEl.value = polished;
    statusMessage.textContent = "Done ✔ Polished with AI.";
  } catch (err) {
    console.error(err);
    statusMessage.textContent =
      "Something went wrong talking to the AI. Please try again.";
  } finally {
    setLoading(false);
  }
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
