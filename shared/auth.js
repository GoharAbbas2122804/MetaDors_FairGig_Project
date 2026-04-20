const DEFAULT_ACCESS_COOKIE_NAME = "fairgig_access_token";
const DEFAULT_REFRESH_COOKIE_NAME = "fairgig_refresh_token";
const DEFAULT_ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const DEFAULT_REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function parseCookieHeader(header = "") {
  if (!header || typeof header !== "string") {
    return {};
  }

  return header.split(";").reduce((cookies, part) => {
    const [rawName, ...rawValueParts] = part.split("=");
    const name = rawName?.trim();

    if (!name) {
      return cookies;
    }

    cookies[name] = decodeURIComponent(rawValueParts.join("=").trim());
    return cookies;
  }, {});
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim() || null;
}

function parseDurationToMs(value, fallbackMs) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return fallbackMs;
  }

  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(\d+)(ms|s|m|h|d)$/);

  if (!match) {
    return fallbackMs;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}

function getCookieNames(env = process.env) {
  return {
    accessCookieName:
      env.AUTH_ACCESS_COOKIE_NAME || DEFAULT_ACCESS_COOKIE_NAME,
    refreshCookieName:
      env.AUTH_REFRESH_COOKIE_NAME || DEFAULT_REFRESH_COOKIE_NAME,
  };
}

function getCookieSettings(env = process.env) {
  const secure = env.AUTH_COOKIE_SECURE === "true";
  const configuredSameSite = (env.AUTH_COOKIE_SAME_SITE || "lax").toLowerCase();
  const sameSite = ["lax", "strict", "none"].includes(configuredSameSite)
    ? configuredSameSite
    : "lax";
  const normalizedSameSite = !secure && sameSite === "none" ? "lax" : sameSite;
  const domain = env.AUTH_COOKIE_DOMAIN?.trim() || undefined;
  const { accessCookieName, refreshCookieName } = getCookieNames(env);
  const accessTokenTtlMs = parseDurationToMs(
    env.JWT_EXPIRES_IN,
    DEFAULT_ACCESS_TOKEN_TTL_MS
  );
  const refreshTokenTtlMs = parseDurationToMs(
    env.JWT_REFRESH_EXPIRES_IN,
    DEFAULT_REFRESH_TOKEN_TTL_MS
  );

  return {
    accessCookieName,
    refreshCookieName,
    accessCookieOptions: {
      httpOnly: true,
      secure,
      sameSite: normalizedSameSite,
      domain,
      path: "/",
      maxAge: accessTokenTtlMs,
    },
    refreshCookieOptions: {
      httpOnly: true,
      secure,
      sameSite: normalizedSameSite,
      domain,
      path: "/api/auth",
      maxAge: refreshTokenTtlMs,
    },
  };
}

function extractAccessToken(req, env = process.env) {
  const bearerToken = extractBearerToken(req);
  if (bearerToken) {
    return bearerToken;
  }

  const cookies = parseCookieHeader(req.headers.cookie);
  const { accessCookieName } = getCookieNames(env);
  return cookies[accessCookieName] || null;
}

function extractRefreshToken(req, env = process.env) {
  const bodyToken =
    typeof req.body?.refreshToken === "string" ? req.body.refreshToken.trim() : "";

  if (bodyToken) {
    return bodyToken;
  }

  const cookies = parseCookieHeader(req.headers.cookie);
  const { refreshCookieName } = getCookieNames(env);
  return cookies[refreshCookieName] || null;
}

function setSessionCookies(res, tokens, env = process.env) {
  const { accessToken, refreshToken } = tokens;
  const {
    accessCookieName,
    refreshCookieName,
    accessCookieOptions,
    refreshCookieOptions,
  } = getCookieSettings(env);

  res.cookie(accessCookieName, accessToken, accessCookieOptions);
  res.cookie(refreshCookieName, refreshToken, refreshCookieOptions);
}

function clearSessionCookies(res, env = process.env) {
  const {
    accessCookieName,
    refreshCookieName,
    accessCookieOptions,
    refreshCookieOptions,
  } = getCookieSettings(env);

  res.clearCookie(accessCookieName, accessCookieOptions);
  res.clearCookie(refreshCookieName, refreshCookieOptions);
}

function parseAllowedOrigins(env = process.env) {
  const rawOrigins = env.FRONTEND_ORIGINS || env.CORS_ALLOWED_ORIGINS || "";

  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function buildCorsOptions(env = process.env) {
  const allowedOrigins = parseAllowedOrigins(env);

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
  };
}

module.exports = {
  buildCorsOptions,
  clearSessionCookies,
  extractAccessToken,
  extractRefreshToken,
  getCookieSettings,
  parseCookieHeader,
  setSessionCookies,
};
