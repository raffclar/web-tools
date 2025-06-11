document.addEventListener("DOMContentLoaded", () => {
  const analyseButton = document.getElementById("analyseButton");
  const uuidInput = document.getElementById("uuidInput");

  analyseButton.addEventListener("click", analyseUUID);
  uuidInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      analyseUUID();
    }
  });
});

function getDate(timeLow, timeMid, versionAndTimeHi) {
  // https://stackoverflow.com/questions/3795554/extract-the-time-from-a-uuid-v1-in-python
  timeLow = parseInt(timeLow, 16);
  timeMid = parseInt(timeMid, 16);
  const timeHi = parseInt(versionAndTimeHi.substring(1), 16);
  const timestamp =
    (BigInt(timeHi) << 48n) | (BigInt(timeMid) << 32n) | BigInt(timeLow);

  // 100-ns to milliseconds
  const NS100_TO_MS = 10000n;
  // Offset between UUID epoch and Unix epoch in 100-ns intervals
  const UUID_EPOCH_OFFSET = 0x01b21dd213814000n;
  // Convert to Unix timestamp in milliseconds
  const unixTimeMs = Number((timestamp - UUID_EPOCH_OFFSET) / NS100_TO_MS);
  return new Date(unixTimeMs);
}

function analyseUUID() {
  try {
    const uuidInput = document.getElementById("uuidInput")?.value;
    if (!uuidInput) {
      throw new Error("UUID input field not found");
    }
    const resultDiv = document.getElementById("result");
    const errorDiv = document.getElementById("error");

    // Reset displays
    errorDiv.style.display = "none";
    resultDiv.style.display = "none";

    const uuidPattern =
      /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/i;

    if (!uuidPattern.test(uuidInput)) {
      errorDiv.textContent = "Please enter a valid UUID";
      errorDiv.style.display = "block";
      return;
    }

    // General parsing logic for UUIDs
    const [, timeLow, timeMid, versionAndTimeHi, variantAndClockSeq, node] =
      uuidInput.match(uuidPattern);
    // Get version (first digit of version_and_time_hi)
    const version = parseInt(versionAndTimeHi[0], 16);
    // Get variant (first 1-3 bits of variant_and_clock_seq)
    const variantBits = parseInt(variantAndClockSeq[0], 16)
      .toString(2)
      .padStart(4, "0");
    let variant;
    if (variantBits[0] === "0") variant = "NCS";
    else if (variantBits.startsWith("10")) variant = "RFC 4122";
    else if (variantBits.startsWith("110")) variant = "Microsoft";
    else variant = "Reserved";

    // Format result
    let analysis = `
    <h3>UUID Components:</h3>
    <ul>
      <li><strong>Time Low:</strong> ${timeLow}</li>
      <li><strong>Time Mid:</strong> ${timeMid}</li>
      <li><strong>Version and Time High:</strong> ${versionAndTimeHi}</li>
      <li><strong>Variant and Clock Sequence:</strong> ${variantAndClockSeq}</li>
      <li><strong>Node:</strong> ${node}</li>
    </ul>
    <h3>UUID Metadata:</h3>
    <ul>
      <li><strong>Version:</strong> ${version}</li>
      <li><strong>Variant:</strong> ${variant}</li>
    </ul>
  `;

    // Get version-specific information from the UUID
    // https://generateguid.online/en#uuidblog
    switch (version) {
      case 1:
        analysis += `
        <h3>Version 1 Specific Information:</h3>
        <ul>
          <li><strong>Timestamp:</strong> ${getDate(timeLow, timeMid, versionAndTimeHi).toISOString()}</li>
          <li><strong>Clock Sequence:</strong> ${variantAndClockSeq}</li>
          <li><strong>Node (MAC Address):</strong> ${node}</li>
        </ul>
      `;
        break;
      case 3:
      case 5:
        analysis += `
        <h3>Version ${version} Information:</h3>
        <p>This is a name-based UUID using ${version === 3 ? "MD5" : "SHA-1"} hashing.</p>
      `;
        break;
      case 4:
        analysis += `
        <h3>Version 4 Information:</h3>
        <p>This is a randomly generated UUID.</p>
      `;
        break;
    }

    resultDiv.innerHTML = analysis;
    resultDiv.style.display = "block";
  } catch (error) {
    console.error("Error analysing UUID:", error);
    const errorDiv = document.getElementById("error");
    if (errorDiv) {
      errorDiv.textContent = "An error occurred while analysing the UUID";
      errorDiv.style.display = "block";
    }
  }
}
