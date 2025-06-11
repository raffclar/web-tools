import { analyseTimestamps } from "../_js/jwt.js";

class JWTanalyser {
  constructor() {
    this.jwtInput = document.getElementById("jwtInput");
    this.analyseButton = document.getElementById("analyseButton");
    this.resultDiv = document.getElementById("result");
    this.errorDiv = document.getElementById("error");
    this.headerData = document.getElementById("headerData");
    this.payloadData = document.getElementById("payloadData");
    this.signatureData = document.getElementById("signatureData");
    this.timeInfo = document.getElementById("timeInfo");

    this.bindEvents();
  }

  bindEvents() {
    this.analyseButton.addEventListener("click", () => this.analyseJWT());
    this.jwtInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.analyseJWT();
    });
  }

  analyseJWT() {
    try {
      const jwt = this.jwtInput.value.trim();
      if (!jwt) throw new Error("Please enter a JWT token");

      // Reset displays
      this.errorDiv.style.display = "none";
      this.resultDiv.style.display = "none";

      // Split JWT into parts
      const parts = jwt.split(".");
      if (parts.length !== 3) throw new Error("Invalid JWT format");

      // Decode parts
      const header = this.decodeJWTPart(parts[0]);
      const payload = this.decodeJWTPart(parts[1]);
      const signature = parts[2];

      this.headerData.textContent = JSON.stringify(header, null, 2);
      this.payloadData.textContent = JSON.stringify(payload, null, 2);
      this.signatureData.textContent = signature;
      this.timeInfo.innerHTML = analyseTimestamps(payload);

      this.resultDiv.style.display = "block";
    } catch (error) {
      this.errorDiv.textContent = error.message;
      this.errorDiv.style.display = "block";
    }
  }

  decodeJWTPart(str) {
    try {
      return JSON.parse(atob(this.padBase64(str)));
    } catch {
      throw new Error("Invalid JWT encoding");
    }
  }

  padBase64(str) {
    // Add padding if needed
    return str.padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new JWTanalyser();
});
