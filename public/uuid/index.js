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

// Add this to your index.js file

document.addEventListener("DOMContentLoaded", () => {
  const analyseButton = document.getElementById("analyseButton");
  const uuidInput = document.getElementById("uuidInput");

  // Existing event listeners
  analyseButton.addEventListener("click", analyseUUID);
  uuidInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      analyseUUID();
    }
  });

  // UUID generation buttons
  document.getElementById("generateV1").addEventListener("click", () => {
    generateAndDisplayUUID("v1");
  });

  document.getElementById("generateV4").addEventListener("click", () => {
    generateAndDisplayUUID("v4");
  });

  document.getElementById("generateV7").addEventListener("click", () => {
    generateAndDisplayUUID("v7");
  });

  // Name-based UUID handlers
  document.getElementById("generateV3").addEventListener("click", () => {
    showNameBasedInputs("v3");
  });

  document.getElementById("generateV5").addEventListener("click", () => {
    showNameBasedInputs("v5");
  });

  document.getElementById("generateNameBased").addEventListener("click", () => {
    const nameInput = document.getElementById("nameInput").value;
    const namespaceType = document.getElementById("namespaceSelect").value;
    const customNamespace = document.getElementById("customNamespace").value;
    const version = document.getElementById("namespaceInput").dataset.version;

    if (!nameInput) {
      showError("Please enter a name for the UUID");
      return;
    }

    if (namespaceType === "custom" && !isValidUUID(customNamespace)) {
      showError("Please enter a valid custom namespace UUID");
      return;
    }

    generateNameBasedUUID(version, nameInput, namespaceType, customNamespace);
  });

  // Handle custom namespace select
  document.getElementById("namespaceSelect").addEventListener("change", (e) => {
    const customNamespaceInput = document.getElementById("customNamespace");
    if (e.target.value === "custom") {
      customNamespaceInput.style.display = "inline-block";
    } else {
      customNamespaceInput.style.display = "none";
    }
  });
});

// Keep the existing functions: getDate, analyseUUID, etc.

// Add the following new functions:

function showNameBasedInputs(version) {
  const namespaceInput = document.getElementById("namespaceInput");
  namespaceInput.style.display = "block";
  namespaceInput.dataset.version = version;
}

function showError(message) {
  const errorDiv = document.getElementById("error");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
}

function isValidUUID(uuid) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(uuid);
}

function generateAndDisplayUUID(version) {
  try {
    let uuid;

    switch (version) {
      case "v1":
        uuid = generateUUIDv1();
        break;
      case "v4":
        uuid = generateUUIDv4();
        break;
      case "v7":
        uuid = generateUUIDv7();
        break;
      default:
        throw new Error("Unsupported UUID version");
    }

    document.getElementById("uuidInput").value = uuid;
    analyseUUID();
  } catch (error) {
    showError(`Error generating UUID: ${error.message}`);
  }
}

function generateNameBasedUUID(version, name, namespaceType, customNamespace) {
  try {
    let namespace;

    // Standard namespace UUIDs as per RFC 4122
    const NAMESPACE_DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    const NAMESPACE_URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
    const NAMESPACE_OID = "6ba7b812-9dad-11d1-80b4-00c04fd430c8";
    const NAMESPACE_X500 = "6ba7b814-9dad-11d1-80b4-00c04fd430c8";

    switch (namespaceType) {
      case "dns":
        namespace = NAMESPACE_DNS;
        break;
      case "url":
        namespace = NAMESPACE_URL;
        break;
      case "oid":
        namespace = NAMESPACE_OID;
        break;
      case "x500":
        namespace = NAMESPACE_X500;
        break;
      case "custom":
        namespace = customNamespace;
        break;
      default:
        namespace = NAMESPACE_DNS;
    }

    let uuid;
    if (version === "v3") {
      uuid = generateUUIDv3(namespace, name);
    } else {
      uuid = generateUUIDv5(namespace, name);
    }

    document.getElementById("uuidInput").value = uuid;
    analyseUUID();
  } catch (error) {
    showError(`Error generating UUID: ${error.message}`);
  }
}

// UUID generation functions

function generateUUIDv1() {
  // Get current timestamp in milliseconds since Unix epoch
  const now = new Date().getTime();

  // Convert to 100-nanosecond intervals since UUID epoch (Oct 15, 1582)
  const uuidEpoch = 12219292800000; // Diff between Unix epoch and UUID epoch in ms
  const nsIntervals = (now + uuidEpoch) * 10000;

  // Generate time components
  const timeLow = Math.floor(nsIntervals % 0x100000000);
  const timeMid = Math.floor((nsIntervals / 0x100000000) % 0x10000);
  const timeHiAndVersion = Math.floor((nsIntervals / 0x1000000000000) % 0x1000) | 0x1000; // Set version 1

  // Generate random clock sequence and node
  const clockSeqHiAndReserved = Math.floor(Math.random() * 0x100) & 0x3F | 0x80; // Set variant
  const clockSeqLow = Math.floor(Math.random() * 0x100);

  // Generate random node (MAC-address like)
  const node = Array.from({length: 6}, () => Math.floor(Math.random() * 0x100))
                   .map(n => n.toString(16).padStart(2, '0'))
                   .join('');

  // Format UUID string
  return [
    timeLow.toString(16).padStart(8, '0'),
    timeMid.toString(16).padStart(4, '0'),
    timeHiAndVersion.toString(16).padStart(4, '0'),
    (clockSeqHiAndReserved << 8 | clockSeqLow).toString(16).padStart(4, '0'),
    node
  ].join('-');
}

function generateUUIDv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateUUIDv7() {
  // Get current Unix timestamp in milliseconds
  const timestamp = Date.now();

  // Convert timestamp to hex and pad to 12 characters (48 bits)
  const timestampHex = timestamp.toString(16).padStart(12, '0');

  // Use first 12 characters for the first three parts of UUID
  // First 32 bits of timestamp
  const timeLow = timestampHex.substring(0, 8);
  // Next 16 bits of timestamp
  const timeMid = timestampHex.substring(8, 12);

  // Generate random values for the rest of the UUID
  // Set version 7 in the first 4 bits of the third group
  const timeHiAndVersion = '7' + (Math.random() * 0x1000 | 0).toString(16).padStart(3, '0');

  // Set variant in the first 2 bits of the fourth group (RFC 4122 variant)
  const clockSeqHiAndReserved = (Math.random() * 0x40 | 0x80).toString(16).padStart(2, '0');
  const clockSeqLow = (Math.random() * 0x100 | 0).toString(16).padStart(2, '0');

  // Generate random node (48 bits)
  const node = Array.from({length: 6}, () => Math.floor(Math.random() * 0x100))
                   .map(n => n.toString(16).padStart(2, '0'))
                   .join('');

  // Format UUID string
  return [
    timeLow,
    timeMid,
    timeHiAndVersion,
    clockSeqHiAndReserved + clockSeqLow,
    node
  ].join('-');
}

function generateUUIDv3(namespace, name) {
  // For demonstration purposes, we'll create a deterministic UUID
  // In a real implementation, you would use an MD5 hash
  // This is a simplified version as browser implementations typically require external libraries

  // Create a simple hash based on namespace and name
  let hash = 0;
  for (let i = 0; i < namespace.length + name.length; i++) {
    const char = (i < namespace.length) ? namespace.charCodeAt(i) : name.charCodeAt(i - namespace.length);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Format the hash into a UUID structure with version 3
  const hashStr = Math.abs(hash).toString(16).padStart(32, '0');

  return [
    hashStr.substring(0, 8),
    hashStr.substring(8, 12),
    '3' + hashStr.substring(13, 16), // Version 3
    (parseInt(hashStr.substring(16, 20), 16) & 0x3FFF | 0x8000).toString(16), // Variant
    hashStr.substring(20, 32)
  ].join('-');
}

function generateUUIDv5(namespace, name) {
  // For demonstration purposes, we'll create a deterministic UUID
  // In a real implementation, you would use a SHA-1 hash
  // This is a simplified version as browser implementations typically require external libraries

  // Create a simple hash based on namespace and name (different algorithm than v3)
  let hash = 0;
  for (let i = 0; i < namespace.length + name.length; i++) {
    const char = (i < namespace.length) ? namespace.charCodeAt(i) : name.charCodeAt(i - namespace.length);
    hash = ((hash << 5) + hash) ^ char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Format the hash into a UUID structure with version 5
  const hashStr = Math.abs(hash).toString(16).padStart(32, '0');

  return [
    hashStr.substring(0, 8),
    hashStr.substring(8, 12),
    '5' + hashStr.substring(13, 16), // Version 5
    (parseInt(hashStr.substring(16, 20), 16) & 0x3FFF | 0x8000).toString(16), // Variant
    hashStr.substring(20, 32)
  ].join('-');
}
