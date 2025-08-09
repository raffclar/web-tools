import { analyseTimestamps } from "../js/jwt.js";

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
    this.amplifyInfo = document.getElementById("amplifyInfo");
    this.tokenTypeInfo = document.getElementById("tokenTypeInfo");

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
      this.amplifyInfo.innerHTML = "";
      this.tokenTypeInfo.innerHTML = "";

      // Split JWT into parts
      const parts = jwt.split(".");
      if (parts.length !== 3) throw new Error("Invalid JWT format");

      // Decode parts
      const header = this.decodeJWTPart(parts[0]);
      const payload = this.decodeJWTPart(parts[1]);
      const signature = parts[2];

      // Display decoded data
      this.headerData.textContent = JSON.stringify(header, null, 2);
      this.payloadData.textContent = JSON.stringify(payload, null, 2);
      this.signatureData.textContent = signature;

      this.timeInfo.innerHTML = analyseTimestamps(payload);
      this.analyseAmplifyToken(header, payload);

      this.resultDiv.style.display = "block";
    } catch (error) {
      this.errorDiv.textContent = error.message;
      this.errorDiv.style.display = "block";
    }
  }

  analyseAmplifyToken(header, payload) {
    let amplifyHtml = "";
    let tokenTypeHtml = "";

    // Determine token type
    const tokenType = this.determineTokenType(payload);
    tokenTypeHtml += `<span class="token-type-badge ${tokenType.class}">${tokenType.label}</span>`;

    // Analyse token content based on type
    if (tokenType.type === "id") {
      amplifyHtml += this.analyseIdToken(payload);
    } else if (tokenType.type === "access") {
      amplifyHtml += this.analyseAccessToken(payload);
    }

    // Display Cognito pool information
    if (payload.iss) {
      const poolId = this.extractPoolId(payload.iss);
      if (poolId) {
        tokenTypeHtml += `<div><strong>Cognito User Pool:</strong> ${poolId}</div>`;
      }
    }

    this.amplifyInfo.innerHTML = amplifyHtml;
    this.tokenTypeInfo.innerHTML = tokenTypeHtml;
  }

  determineTokenType(payload) {
    if (payload.token_use === "id") {
      return { type: "id", label: "ID Token", class: "id-token" };
    } else if (payload.token_use === "access") {
      return { type: "access", label: "Access Token", class: "access-token" };
    } else if (payload.token_use === "refresh") {
      return {
        type: "refresh",
        label: "Refresh Token",
        class: "refresh-token",
      };
    }
    return { type: "unknown", label: "Unknown Token Type", class: "" };
  }

  analyseIdToken(payload) {
    let html = '<h4>Identity Information</h4><div class="user-info">';

    // User details
    if (payload.sub)
      html += `<div><strong>User ID:</strong> ${payload.sub}</div>`;
    if (payload.email)
      html += `<div><strong>Email:</strong> ${payload.email}</div>`;
    if (payload.email_verified)
      html += `<div><strong>Email Verified:</strong> ${payload.email_verified}</div>`;
    if (payload.name)
      html += `<div><strong>Name:</strong> ${payload.name}</div>`;
    if (payload.phone_number)
      html += `<div><strong>Phone:</strong> ${payload.phone_number}</div>`;
    if (payload["cognito:username"])
      html += `<div><strong>Username:</strong> ${payload["cognito:username"]}</div>`;

    // Cognito groups
    if (payload["cognito:groups"]) {
      html += "<div><strong>Cognito Groups:</strong><div>";
      payload["cognito:groups"].forEach((group) => {
        html += `<span class="cognito-group">${group}</span>`;
      });
      html += "</div></div>";
    }

    // Custom attributes
    const customAttributes = Object.entries(payload).filter(([key]) =>
      key.startsWith("custom:"),
    );
    if (customAttributes.length > 0) {
      html +=
        '<div class="custom-attributes"><strong>Custom Attributes:</strong>';
      customAttributes.forEach(([key, value]) => {
        html += `<div>${key.replace("custom:", "")}: ${value}</div>`;
      });
      html += "</div>";
    }

    html += "</div>";
    return html;
  }

  analyseAccessToken(payload) {
    let html = '<h4>Access Information</h4><div class="user-info">';

    // Scope information
    if (payload.scope) {
      const scopes = payload.scope.split(" ");
      html += '<div><strong>Scopes:</strong><div class="scope-list">';
      scopes.forEach((scope) => {
        html += `<span class="scope-item">${scope}</span>`;
      });
      html += "</div></div>";
    }

    // Client ID
    if (payload.client_id) {
      html += `<div><strong>Client ID:</strong> ${payload.client_id}</div>`;
    }

    // Username
    if (payload.username) {
      html += `<div><strong>Username:</strong> ${payload.username}</div>`;
    }

    // Device key
    if (payload.device_key) {
      html += `<div><strong>Device Key:</strong> ${payload.device_key}</div>`;
    }

    html += "</div>";
    return html;
  }

  extractPoolId(issuer) {
    const match = issuer.match(/cognito-idp\.([\w-]+)\.amazonaws\.com\/(\w+)/);
    return match ? `${match[2]} (${match[1]})` : null;
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
