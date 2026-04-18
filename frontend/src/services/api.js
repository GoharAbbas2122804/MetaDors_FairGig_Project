import axios from "axios";

const createServiceClient = (baseURL) => {
  const client = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  return client;
};

export const authAPI = createServiceClient("http://localhost:5001");
export const earningsAPI = createServiceClient("http://localhost:5001");
export const grievanceAPI = createServiceClient("http://localhost:5002");
export const certificateAPI = createServiceClient("http://localhost:5003");
export const anomalyAPI = createServiceClient("http://localhost:8001");
export const analyticsAPI = createServiceClient("http://localhost:8002");

export default {
  authAPI,
  earningsAPI,
  grievanceAPI,
  certificateAPI,
  anomalyAPI,
  analyticsAPI,
};
