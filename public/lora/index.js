const metadataContainer = document.getElementById('metadataContainer');
const metadataDiv = document.getElementById('metadata');
const fileInput = document.getElementById('loraFile');

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function readLoraMetadata(file) {
    try {
        const buffer = await file.arrayBuffer();
        const view = new DataView(buffer);

        // Check for safetensors format
        const headerLength = view.getBigUint64(0, true);
        if (headerLength <= 0) {
            throw new Error('Invalid LORA file format');
        }

        // Read the JSON header
        const headerBytes = new Uint8Array(buffer, 8, Number(headerLength));
        const decoder = new TextDecoder('utf-8');
        const headerJson = decoder.decode(headerBytes);
        const metadata = JSON.parse(headerJson);

        displayMetadata(metadata);
    } catch (error) {
        displayError('Error reading LORA file: ' + error.message);
    }
}

function displayMetadata(metadata) {
    metadataDiv.innerHTML = '';
    metadataContainer.classList.remove('hidden');

    // Display general metadata
    if (metadata.__metadata__) {
        displaySection(metadata.__metadata__, 'General Metadata');
    }

    // Display tensor metadata
    const tensorInfo = {};
    for (const [key, value] of Object.entries(metadata)) {
        if (key !== '__metadata__') {
            tensorInfo[key] = JSON.stringify(value);
        }
    }
    if (Object.keys(tensorInfo).length > 0) {
        displaySection(tensorInfo, 'Tensor Information');
    }
}

function displaySection(metadata, title) {
    const section = document.createElement('div');
    section.innerHTML = `<h3>${title}</h3>`;

    for (const [key, value] of Object.entries(metadata)) {
        const item = document.createElement('div');
        item.className = 'metadata-item';
        item.innerHTML = `
            <span class="metadata-item-key">${escapeHtml(key)}</span>
            <span class="metadata-item-value">${escapeHtml(String(value))}</span>
        `;
        section.appendChild(item);
    }

    metadataDiv.appendChild(section);
}

function displayError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    metadataDiv.innerHTML = '';
    metadataDiv.appendChild(errorDiv);
    metadataContainer.classList.remove('hidden');
}

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        readLoraMetadata(file);
    }
});