function redactMongoUri(uri = "") {
  if (typeof uri !== "string" || !uri.trim()) {
    return "<unset>";
  }

  return uri.replace(
    /(mongodb(?:\+srv)?:\/\/)([^:@/]+)(?::([^@/]*))?@/i,
    (match, protocol, username) => `${protocol}${username}:***@`
  );
}

function sanitizeErrorForLog(error) {
  if (!error) {
    return "Unknown error";
  }

  const message =
    typeof error === "string"
      ? error
      : typeof error.message === "string"
        ? error.message
        : "Unknown error";

  return message.replace(
    /(mongodb(?:\+srv)?:\/\/)([^:@/]+)(?::([^@/]*))?@/gi,
    (match, protocol, username) => `${protocol}${username}:***@`
  );
}

function applySecurityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  next();
}

module.exports = {
  applySecurityHeaders,
  redactMongoUri,
  sanitizeErrorForLog,
};
