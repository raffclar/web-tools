// Shared code for JWT tools

export function analyseTimestamps(payload) {
  const now = Math.floor(Date.now() / 1000);
  let timeHtml = "";

  if (payload.iat) {
    const iatDate = new Date(payload.iat * 1000);
    timeHtml += `<div><strong>Issued At:</strong> ${iatDate.toLocaleString()}</div>`;
  }

  if (payload.exp) {
    const expDate = new Date(payload.exp * 1000);
    const isExpired = now > payload.exp;
    timeHtml += `<div>
                <strong>Expires At:</strong> ${expDate.toLocaleString()}
                <span class="${isExpired ? "expired" : "valid"}">
                    (${isExpired ? "Expired" : "Valid"})
                </span>
            </div>`;

    if (!isExpired) {
      const timeLeft = payload.exp - now;
      const hours = Math.floor(timeLeft / 3600);
      const minutes = Math.floor((timeLeft % 3600) / 60);
      timeHtml += `<div><strong>Time Left:</strong> ${hours}h ${minutes}m</div>`;
    }
  }

  if (payload.nbf) {
    const nbfDate = new Date(payload.nbf * 1000);
    const isValid = now >= payload.nbf;
    timeHtml += `<div>
                <strong>Not Before:</strong> ${nbfDate.toLocaleString()}
                <span class="${isValid ? "valid" : "expired"}">
                    (${isValid ? "Valid" : "Not Yet Valid"})
                </span>
            </div>`;
  }

  return timeHtml;
}
