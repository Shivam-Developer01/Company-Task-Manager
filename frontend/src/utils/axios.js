import axios from "axios";
import { API_BASE_URL } from "../constants/config";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};

// ================= REQUEST =================

api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ================= RESPONSE =================

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (
      !originalRequest ||
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/refresh-token")
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/auth/refresh-token`,
        {
          refreshToken,
        },
      );

      const { accessToken } = response.data;

      if (!accessToken) {
        throw new Error("Invalid access token returned from refresh service");
      }

      localStorage.setItem("accessToken", accessToken);

      processQueue(null, accessToken);

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;

      return api(originalRequest);
    } catch (err) {
      processQueue(err, null);

      localStorage.clear();

      if (typeof window !== "undefined") {
        window.location.href = "/";
      }

      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
