const fileInput = document.getElementById("fileInput");
const imagePreview = document.getElementById("imagePreview");
const metadataDiv = document.getElementById("metadata");
const previewContainer = document.getElementById("previewContainer");

// Handle dropped files
fileInput.addEventListener("change", handleFileSelect, false);

function handleFileSelect(e) {
  const file = e.target.files[0];
  handleFile(file);
}

function handleFile(file) {
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();

    reader.onload = function (e) {
      // Display image preview
      imagePreview.src = e.target.result;
      previewContainer.classList.remove("hidden");

      // Extract metadata
      extractMetadata(file);
    };

    reader.readAsDataURL(file);
  } else {
    alert("Please upload an image file.");
  }
}

async function extractMetadata(file) {
  try {
    // Clear previous metadata
    metadataDiv.innerHTML = "";

    // Get basic file information
    const basicMetadata = {
      "File Name": file.name,
      "File Type": file.type,
      "File Size": formatFileSize(file.size),
      "Last Modified": new Date(file.lastModified).toLocaleString(),
    };

    // Display basic metadata
    displayMetadata(basicMetadata, "Basic Information");

    // Read PNG metadata for Stable Diffusion
    const arrayBuffer = await file.arrayBuffer();
    if (file.type === "image/png") {
      const pngMetadata = await extractPngMetadata(arrayBuffer);
      if (pngMetadata) {
        displayStableDiffusionMetadata(
          pngMetadata,
          "Stable Diffusion Parameters",
        );
      }
    }

    // Extract EXIF metadata
    const exifData = await extractExifData(arrayBuffer);
    if (exifData) {
      displayMetadata(exifData, "EXIF Data");
    }
  } catch (error) {
    console.error("Error extracting metadata:", error);
    metadataDiv.innerHTML += `<div class="metadata-item">Error extracting metadata: ${error.message}</div>`;
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function extractExifData(arrayBuffer) {
  try {
    // Look for EXIF marker (0xFFE1)
    const view = new DataView(arrayBuffer);
    let offset = 0;

    if (view.getUint16(offset) !== 0xffd8) {
      return null; // Not a JPEG
    }

    offset += 2;

    while (offset < view.byteLength) {
      const marker = view.getUint16(offset);
      offset += 2;

      if (marker === 0xffe1) {
        // Found EXIF!
        const exifLength = view.getUint16(offset);
        const exifData = new Uint8Array(
          arrayBuffer,
          offset + 2,
          exifLength - 2,
        );
        return parseExifData(exifData);
      }

      offset += view.getUint16(offset);
    }

    return null;
  } catch (error) {
    console.error("Error reading EXIF data:", error);
    return null;
  }
}

function parseExifData(exifData) {
  // Basic EXIF parsing - extend this based on your needs
  const exifObject = {};

  try {
    const textDecoder = new TextDecoder();
    const exifText = textDecoder.decode(exifData);

    // Look for common EXIF fields
    const fields = [
      "Make",
      "Model",
      "DateTime",
      "Software",
      "Artist",
      "Copyright",
      "ImageDescription",
    ];

    fields.forEach((field) => {
      const match = exifText.match(new RegExp(field + "\\0([^\\0]+)"));
      if (match) {
        exifObject[field] = match[1].trim();
      }
    });
  } catch (error) {
    console.error("Error parsing EXIF data:", error);
  }

  return exifObject;
}

async function extractPngMetadata(arrayBuffer) {
  try {
    const view = new DataView(arrayBuffer);
    let offset = 8; // Skip PNG signature

    const metadata = {};

    while (offset < arrayBuffer.byteLength) {
      const length = view.getUint32(offset);
      offset += 4;

      // Get a chunk type
      const chunkType = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3),
      );
      offset += 4;

      // Look for tEXt chunks
      if (chunkType === "tEXt") {
        let textData = "";
        let key = "";
        let isKey = true;

        // Read until null byte for a key
        for (let i = 0; i < length; i++) {
          const byte = view.getUint8(offset + i);
          if (byte === 0) {
            isKey = false;
            continue;
          }
          if (isKey) {
            key += String.fromCharCode(byte);
          } else {
            textData += String.fromCharCode(byte);
          }
        }

        // Process Automatic1111 specific metadata
        if (key === "parameters") {
          const params = textData.split("\n");
          params.forEach((param) => {
            if (param.includes(":")) {
              const [paramKey, ...paramValue] = param.split(":");
              metadata[paramKey.trim()] = paramValue.join(":").trim();
            } else if (param.trim()) {
              // Handle the prompt which doesn't have a key
              if (!metadata["Prompt"]) {
                metadata["Prompt"] = param.trim();
              } else if (
                !metadata["Negative prompt"] &&
                param.toLowerCase().includes("negative prompt")
              ) {
                metadata["Negative prompt"] = param
                  .replace("Negative prompt:", "")
                  .trim();
              }
            }
          });
        }
      }

      offset += length + 4; // Skip CRC
    }

    return metadata;
  } catch (error) {
    console.error("Error extracting PNG metadata:", error);
    return null;
  }
}

const escapeHtml = (unsafe) => {
  return unsafe
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

function displayStableDiffusionMetadata(metadata, title = "") {
  if (title) {
    metadataDiv.innerHTML += `<h3>${title}</h3>`;
  }

  const item = document.createElement("div");
  item.className = "metadata-item";
  item.innerHTML = `<span class="metadata-item-key">`;
  for (const [key, value] of Object.entries(metadata)) {
    if (value) {
      item.innerHTML += `${escapeHtml(key)}: ${escapeHtml(value)}`;
      metadataDiv.appendChild(item);
    }
  }
  item.innerHTML += `</span>`;
}

function displayMetadata(metadata, title = "") {
  if (title) {
    metadataDiv.innerHTML += `<h3>${title}</h3>`;
  }

  for (const [key, value] of Object.entries(metadata)) {
    if (value) {
      const item = document.createElement("div");
      item.className = "metadata-item";
      item.innerHTML = `<span class="metadata-item-key">${key}:</span> ${value}`;
      metadataDiv.appendChild(item);
    }
  }
}
