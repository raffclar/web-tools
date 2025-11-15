document.addEventListener("DOMContentLoaded", () => {
  // Initialize copy buttons
  document.querySelectorAll(".button-group button").forEach((button) => {
    button.addEventListener("click", handleCopy);
  });

  // Initial update
  updateDatetimes();

  // Update every second
  setInterval(updateDatetimes, 1000);
});

function updateDatetimes() {
  const now = new Date();

  // Update Unix epoch
  const unixEpoch = Math.floor(now.getTime() / 1000);
  document.getElementById("unix-epoch").textContent = unixEpoch;

  // Update ISO datetime
  document.getElementById("iso-datetime").textContent = now.toISOString();
}

async function handleCopy(event) {
  const button = event.target;
  const targetId = button.getAttribute("data-target");
  const value = document.getElementById(targetId).textContent;

  try {
    await navigator.clipboard.writeText(value);

    // Visual feedback
    button.textContent = "Copied!";
    button.classList.add("copied");

    // Reset button after 2 seconds
    setTimeout(() => {
      button.textContent = "Copy";
      button.classList.remove("copied");
    }, 2000);
  } catch (err) {
    console.error("Failed to copy:", err);
    button.textContent = "Failed";
    setTimeout(() => {
      button.textContent = "Copy";
    }, 2000);
  }
}
