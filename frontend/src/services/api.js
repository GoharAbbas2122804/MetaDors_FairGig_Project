import axios from "axios";

const browserProtocol =
  typeof window !== "undefined" ? window.location.protocol : "http:";
const browserHostname =
  typeof window !== "undefined" ? window.location.hostname : "localhost";

function resolveServiceBaseUrl(envValue, fallbackPort) {
  return envValue || `${browserProtocol}//${browserHostname}:${fallbackPort}`;
}

// Vite only exposes variables prefixed with VITE_. These values are public in the browser,
// so API base URLs are safe here, but secrets like database URIs or JWT signing keys are not.
const AUTH_BASE_URL = resolveServiceBaseUrl(
  import.meta.env.VITE_AUTH_API_URL,
  5001
);
const EARNINGS_BASE_URL = resolveServiceBaseUrl(
  import.meta.env.VITE_EARNINGS_API_URL,
  5001
);
const GRIEVANCE_BASE_URL = resolveServiceBaseUrl(
  import.meta.env.VITE_GRIEVANCE_API_URL,
  5002
);
const CERTIFICATE_BASE_URL = resolveServiceBaseUrl(
  import.meta.env.VITE_CERTIFICATE_API_URL,
  5003
);
const ANOMALY_BASE_URL = resolveServiceBaseUrl(
  import.meta.env.VITE_ANOMALY_API_URL,
  8001
);
const ANALYTICS_BASE_URL = resolveServiceBaseUrl(
  import.meta.env.VITE_ANALYTICS_API_URL,
  8002
);

export const serviceBaseUrls = {
  auth: AUTH_BASE_URL,
  earnings: EARNINGS_BASE_URL,
  grievance: GRIEVANCE_BASE_URL,
  certificate: CERTIFICATE_BASE_URL,
  anomaly: ANOMALY_BASE_URL,
  analytics: ANALYTICS_BASE_URL,
};

export function resolveServiceAssetUrl(baseUrl, assetPath) {
  if (!assetPath) {
    return "";
  }

  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  const normalizedPath = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  return `${baseUrl}${normalizedPath}`;
}

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

const createServiceClient = (baseURL) => {
  const client = axios.create({
    baseURL,
    headers: JSON_HEADERS,
    withCredentials: true,
  });

  return client;
};

const refreshClient = axios.create({
  baseURL: AUTH_BASE_URL,
  headers: JSON_HEADERS,
  withCredentials: true,
});

let refreshPromise = null;

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post("/api/auth/refresh-token")
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function shouldAttemptRefresh(originalRequest, status) {
  const requestUrl = originalRequest?.url || "";

  if (!originalRequest || originalRequest._retry || status !== 401) {
    return false;
  }

  return ![
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
    "/api/auth/refresh-token",
  ].some((path) => requestUrl.includes(path));
}

function attachRefreshInterceptor(client) {
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      const status = error.response?.status;

      if (!shouldAttemptRefresh(originalRequest, status)) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        await refreshSession();
        return client(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
  );
}

export const authAPI = createServiceClient(AUTH_BASE_URL);
export const earningsAPI = createServiceClient(EARNINGS_BASE_URL);
export const grievanceAPI = createServiceClient(GRIEVANCE_BASE_URL);
export const certificateAPI = createServiceClient(CERTIFICATE_BASE_URL);
export const anomalyAPI = createServiceClient(ANOMALY_BASE_URL);
export const analyticsAPI = createServiceClient(ANALYTICS_BASE_URL);

[
  authAPI,
  earningsAPI,
  grievanceAPI,
  certificateAPI,
  anomalyAPI,
  analyticsAPI,
].forEach(attachRefreshInterceptor);

export default {
  authAPI,
  earningsAPI,
  grievanceAPI,
  certificateAPI,
  anomalyAPI,
  analyticsAPI,
};
