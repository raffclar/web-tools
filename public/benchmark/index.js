class FractalBenchmark {
  constructor() {
    // Initialize color cache
    this.colorCache = new Map();
    this.chunkSize = 256; // Size of chunks for processing
    this.currentChunk = { x: 0, y: 0 };
    this.isProcessing = false;

    this.canvas = document.getElementById("fractalCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.lastFpsUpdate = this.lastTime;

    this.maxIterations = document.getElementById("maxIterations");
    this.fpsCounter = document.getElementById("fpsCounter");
    this.resolutionDisplay = document.getElementById("resolution");
    this.pixelCountDisplay = document.getElementById("pixelCount");
    this.calcCountDisplay = document.getElementById("calcCount");
    this.currentZoomDisplay = document.getElementById("currentZoom");
    this.centerCoordsDisplay = document.getElementById("centerCoords");

    // Fractal view state
    this.centerX = -0.5;
    this.centerY = 0;
    this.zoom = 1;

    // Mouse interaction state
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // Bind event listeners
    this.bindEvents();

    // Set initial size
    this.resizeCanvas();

    // Start the animation
    requestAnimationFrame(() => this.animate());
  }

  bindEvents() {
    window.addEventListener("resize", () => this.resizeCanvas());

    this.maxIterations.addEventListener("input", (e) => {
      document.getElementById("iterValue").textContent = e.target.value;
    });

    // Mouse events for panning
    this.canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e));
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    this.canvas.addEventListener("mouseup", () => this.handleMouseUp());
    this.canvas.addEventListener("mouseleave", () => this.handleMouseUp());

    // Wheel event for zooming
    this.canvas.addEventListener("wheel", (e) => this.handleWheel(e));

    // Double click to zoom in
    this.canvas.addEventListener("dblclick", (e) => this.handleDoubleClick(e));

    // Right click to reset
    this.canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.resetView();
    });
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // Update resolution display
    this.resolutionDisplay.textContent = `${this.canvas.width}x${this.canvas.height}`;
    this.pixelCountDisplay.textContent = (
      this.canvas.width * this.canvas.height
    ).toLocaleString();
    this.updateDisplays();
  }

  updateDisplays() {
    this.currentZoomDisplay.textContent = `${this.zoom.toFixed(2)}x`;
    this.centerCoordsDisplay.textContent = `(${this.centerX.toFixed(6)}, ${this.centerY.toFixed(6)})`;
  }

  handleMouseDown(e) {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;

    const scale =
      2.5 / Math.min(this.canvas.width, this.canvas.height) / this.zoom;

    this.centerX -= deltaX * scale;
    this.centerY -= deltaY * scale;

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    this.updateDisplays();
  }

  handleMouseUp() {
    this.isDragging = false;
  }

  handleWheel(e) {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert mouse position to fractal coordinates
    const scale =
      2.5 / Math.min(this.canvas.width, this.canvas.height) / this.zoom;
    const fractalX = (mouseX - this.canvas.width / 2) * scale + this.centerX;
    const fractalY = (mouseY - this.canvas.height / 2) * scale + this.centerY;

    // Zoom factor
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = this.zoom * zoomFactor;

    // Limit zoom to prevent numerical instability
    if (newZoom > 0.001 && newZoom < 1000000) {
      // Adjust center to zoom towards mouse position
      this.centerX = fractalX - (fractalX - this.centerX) / zoomFactor;
      this.centerY = fractalY - (fractalY - this.centerY) / zoomFactor;

      this.zoom = newZoom;

      // Update zoom slider
      this.zoomLevel.value = Math.round(this.zoom * 100);
      document.getElementById("zoomValue").textContent = this.zoom.toFixed(2);

      this.updateDisplays();
    }
  }

  handleDoubleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert mouse position to fractal coordinates
    const scale =
      2.5 / Math.min(this.canvas.width, this.canvas.height) / this.zoom;
    this.centerX = (mouseX - this.canvas.width / 2) * scale + this.centerX;
    this.centerY = (mouseY - this.canvas.height / 2) * scale + this.centerY;

    // Zoom in by 2x
    this.zoom *= 2;

    // Update zoom slider
    this.zoomLevel.value = Math.round(this.zoom * 100);
    document.getElementById("zoomValue").textContent = this.zoom.toFixed(2);

    this.updateDisplays();
  }

  resetView() {
    this.centerX = -0.5;
    this.centerY = 0;
    this.zoom = 1;

    // Update zoom slider
    this.zoomLevel.value = 100;
    document.getElementById("zoomValue").textContent = "1.00";

    this.updateDisplays();
  }

  updateFPS() {
    const now = performance.now();
    const elapsed = now - this.lastFpsUpdate;

    if (elapsed >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / elapsed);
      this.fpsCounter.textContent = fps;

      // Update FPS color
      this.fpsCounter.className =
        fps > 30 ? "fps-high" : fps > 15 ? "fps-medium" : "fps-low";

      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  mandelbrot(x0, y0, maxIter) {
    let x = 0,
      y = 0;
    let iter = 0;

    // Period checking
    let xOld = 0,
      yOld = 0;
    let period = 0;

    // Main cardioid and period-2 bulb check
    const q = (x0 - 0.25) * (x0 - 0.25) + y0 * y0;
    if (
      q * (q + (x0 - 0.25)) <= 0.25 * y0 * y0 ||
      (x0 + 1) * (x0 + 1) + y0 * y0 <= 0.0625
    ) {
      return maxIter;
    }

    while (x * x + y * y <= 4 && iter < maxIter) {
      const xtemp = x * x - y * y + x0;
      y = 2 * x * y + y0;
      x = xtemp;

      // Early bailout optimization
      if (x * x + y * y > 4) break;

      // Period checking
      if (x === xOld && y === yOld) {
        iter = maxIter;
        break;
      }

      period++;
      if (period > 20) {
        period = 0;
        xOld = x;
        yOld = y;
      }

      iter++;
    }

    return iter;
  }

  getCachedColor(iter, maxIter) {
    const key = `${iter},${maxIter}`;
    if (!this.colorCache.has(key)) {
      let color;
      if (iter === maxIter) {
        color = [0, 0, 0];
      } else {
        const hue = (iter / maxIter) * 360;
        const sat = 100;
        const lit = 50;

        const c = ((1 - Math.abs((2 * lit) / 100 - 1)) * sat) / 100;
        const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
        const m = lit / 100 - c / 2;

        let r, g, b;

        if (hue < 60) {
          r = c;
          g = x;
          b = 0;
        } else if (hue < 120) {
          r = x;
          g = c;
          b = 0;
        } else if (hue < 180) {
          r = 0;
          g = c;
          b = x;
        } else if (hue < 240) {
          r = 0;
          g = x;
          b = c;
        } else if (hue < 300) {
          r = x;
          g = 0;
          b = c;
        } else {
          r = c;
          g = 0;
          b = x;
        }

        color = [(r + m) * 255, (g + m) * 255, (b + m) * 255];
      }
      this.colorCache.set(key, color);
    }
    return this.colorCache.get(key);
  }

  async render() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const maxIter = parseInt(this.maxIterations.value);
    const scale = 2.5 / Math.min(width, height) / this.zoom;

    // Create buffer if needed
    if (
      !this.imageData ||
      this.imageData.width !== width ||
      this.imageData.height !== height
    ) {
      this.imageData = this.ctx.createImageData(width, height);
    }

    const data = this.imageData.data;
    let calculations = 0;

    // Process one chunk
    const startX = this.currentChunk.x;
    const startY = this.currentChunk.y;
    const endX = Math.min(startX + this.chunkSize, width);
    const endY = Math.min(startY + this.chunkSize, height);

    for (let py = startY; py < endY; py++) {
      for (let px = startX; px < endX; px++) {
        const x0 = (px - width / 2) * scale + this.centerX;
        const y0 = (py - height / 2) * scale + this.centerY;

        const iter = this.mandelbrot(x0, y0, maxIter);
        calculations++;

        const pos = (py * width + px) * 4;
        const [r, g, b] = this.getCachedColor(iter, maxIter);
        data[pos] = r;
        data[pos + 1] = g;
        data[pos + 2] = b;
        data[pos + 3] = 255;
      }
    }

    // Update chunk position
    this.currentChunk.x += this.chunkSize;
    if (this.currentChunk.x >= width) {
      this.currentChunk.x = 0;
      this.currentChunk.y += this.chunkSize;
      if (this.currentChunk.y >= height) {
        this.currentChunk.y = 0;
      }
    }

    this.ctx.putImageData(this.imageData, 0, 0);
    this.calcCountDisplay.textContent = calculations.toLocaleString();
    this.isProcessing = false;
  }

  animate() {
    this.frameCount++;
    this.updateFPS();
    this.render();
    requestAnimationFrame(() => this.animate());
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new FractalBenchmark();
});
