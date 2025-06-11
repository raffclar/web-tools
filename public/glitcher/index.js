class ImageGlitcher {
  constructor() {
    this.initializeElements();
    this.bindEvents();
    this.activeEffects = new Set();
  }

  initializeElements() {
    this.imageInput = document.getElementById("imageInput");
    this.originalCanvas = document.getElementById("originalCanvas");
    this.glitchCanvas = document.getElementById("glitchCanvas");
    this.glitchAmount = document.getElementById("glitchAmount");
    this.glitchValue = document.getElementById("glitchValue");
    this.downloadBtn = document.getElementById("downloadBtn");
    this.effectBtns = document.querySelectorAll(".effect-btn");

    this.originalCtx = this.originalCanvas.getContext("2d");
    this.glitchCtx = this.glitchCanvas.getContext("2d");
  }

  bindEvents() {
    this.imageInput.addEventListener("change", (e) =>
      this.handleImageUpload(e),
    );
    this.glitchAmount.addEventListener("input", () => this.updateGlitch());
    this.effectBtns.forEach((btn) => {
      btn.addEventListener("click", () => this.toggleEffect(btn));
    });
    this.downloadBtn.addEventListener("click", () => this.downloadImage());
  }

  async handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const img = await this.loadImage(file);
    this.setupCanvases(img);
    this.drawOriginalImage(img);
    this.updateGlitch();
    this.downloadBtn.disabled = false;
  }

  loadImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  setupCanvases(img) {
    const maxWidth = 800;
    const scale = Math.min(1, maxWidth / img.width);
    const width = img.width * scale;
    const height = img.height * scale;

    this.originalCanvas.width = width;
    this.originalCanvas.height = height;
    this.glitchCanvas.width = width;
    this.glitchCanvas.height = height;
  }

  drawOriginalImage(img) {
    this.originalCtx.drawImage(
      img,
      0,
      0,
      this.originalCanvas.width,
      this.originalCanvas.height,
    );
  }

  toggleEffect(btn) {
    const effect = btn.dataset.effect;
    if (this.activeEffects.has(effect)) {
      this.activeEffects.delete(effect);
      btn.classList.remove("active");
    } else {
      this.activeEffects.add(effect);
      btn.classList.add("active");
    }
    this.updateGlitch();
  }

  updateGlitch() {
    if (!this.originalCanvas.width) return;

    this.glitchValue.textContent = `${this.glitchAmount.value}%`;
    const intensity = this.glitchAmount.value / 100;

    this.glitchCtx.drawImage(this.originalCanvas, 0, 0);
    const imageData = this.glitchCtx.getImageData(
      0,
      0,
      this.glitchCanvas.width,
      this.glitchCanvas.height,
    );

    for (const effect of this.activeEffects) {
      this.applyEffect(imageData, effect, intensity);
    }

    this.glitchCtx.putImageData(imageData, 0, 0);
  }

  applyEffect(imageData, effect, intensity) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    switch (effect) {
      case "pixelSort":
        this.pixelSortEffect(data, width, height, intensity);
        break;
      case "rgbShift":
        this.rgbShiftEffect(data, width, height, intensity);
        break;
      case "scanlines":
        this.scanlinesEffect(data, width, height, intensity);
        break;
      case "noise":
        this.noiseEffect(data, width, height, intensity);
        break;
      case "compression":
        this.compressionEffect(data, width, height, intensity);
        break;
      case "dataMosh":
        this.dataMoshEffect(data, width, height, intensity);
        break;
    }
  }

  pixelSortEffect(data, width, height, intensity) {
    for (let y = 0; y < height; y++) {
      if (Math.random() > intensity) continue;

      let row = [];
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        row.push([data[i], data[i + 1], data[i + 2], data[i + 3]]);
      }

      row.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));

      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        data[i] = row[x][0];
        data[i + 1] = row[x][1];
        data[i + 2] = row[x][2];
        data[i + 3] = row[x][3];
      }
    }
  }

  rgbShiftEffect(data, width, height, intensity) {
    const shift = Math.floor(10 * intensity);
    const tempData = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const shiftedX = (x + shift) % width;
        const shiftedI = (y * width + shiftedX) * 4;

        data[i] = tempData[shiftedI]; // R
        data[i + 1] = tempData[i + 1]; // G
        data[i + 2] = tempData[i + 2 - shift * 4]; // B
      }
    }
  }

  scanlinesEffect(data, width, height, intensity) {
    for (let y = 0; y < height; y++) {
      if (y % 2 === 0) continue;
      const darkness = 1 - intensity * 0.5;

      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        data[i] *= darkness; // R
        data[i + 1] *= darkness; // G
        data[i + 2] *= darkness; // B
      }
    }
  }

  noiseEffect(data, width, height, intensity) {
    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() > intensity) continue;
      const noise = (Math.random() - 0.5) * 100 * intensity;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
  }

  compressionEffect(data, width, height, intensity) {
    const blockSize = Math.max(1, Math.floor(8 * intensity));
    for (let y = 0; y < height; y += blockSize) {
      for (let x = 0; x < width; x += blockSize) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0;
        let count = 0;

        // Average the block
        for (let by = 0; by < blockSize && y + by < height; by++) {
          for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
            const i = ((y + by) * width + (x + bx)) * 4;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            a += data[i + 3];
            count++;
          }
        }

        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        a = Math.floor(a / count);

        // Fill the block
        for (let by = 0; by < blockSize && y + by < height; by++) {
          for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
            const i = ((y + by) * width + (x + bx)) * 4;
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = a;
          }
        }
      }
    }
  }

  dataMoshEffect(data, width, height, intensity) {
    const blockHeight = Math.floor(height * 0.1);
    for (let y = 0; y < height; y += blockHeight) {
      if (Math.random() > intensity) continue;

      const offsetX = Math.floor((Math.random() - 0.5) * width * 0.1);
      for (let by = 0; by < blockHeight && y + by < height; by++) {
        for (let x = 0; x < width; x++) {
          const sourceX = (x + offsetX + width) % width;
          const i = ((y + by) * width + x) * 4;
          const sourceI = ((y + by) * width + sourceX) * 4;

          data[i] = data[sourceI];
          data[i + 1] = data[sourceI + 1];
          data[i + 2] = data[sourceI + 2];
          data[i + 3] = data[sourceI + 3];
        }
      }
    }
  }

  downloadImage() {
    const link = document.createElement("a");
    link.download = "glitched-image.png";
    link.href = this.glitchCanvas.toDataURL();
    link.click();
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new ImageGlitcher();
});
