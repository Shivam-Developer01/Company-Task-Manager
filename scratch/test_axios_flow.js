const path = require("path");
const http = require("http");
const fs = require("fs");

module.paths.push(path.join(__dirname, "../Backend/node_modules"));
module.paths.push(path.join(__dirname, "../frontend/node_modules"));

const jwt = require(path.join(__dirname, "../Backend/node_modules/jsonwebtoken"));
const axios = require(path.join(__dirname, "../frontend/node_modules/axios"));

const JWT_SECRET = "test_secret_key_123";
const REFRESH_SECRET = "test_refresh_secret_key_123";

let refreshEndpointCallCount = 0;

// Set up mock backend server
const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.url === "/api/auth/refresh-token" && req.method === "POST") {
    refreshEndpointCallCount++;
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const newAccessToken = jwt.sign({ userId: "user123" }, JWT_SECRET, { expiresIn: "15m" });
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, accessToken: newAccessToken }));
    });
    return;
  }

  if (req.url === "/api/test-data") {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    try {
      if (!token) throw new Error("No token");
      jwt.verify(token, JWT_SECRET);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, data: "Protected Data Payload" }));
    } catch (err) {
      res.writeHead(401);
      res.end(JSON.stringify({ success: false, message: "Token expired or invalid" }));
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(9876, async () => {
  console.log("Mock Auth Server running on port 9876");

  // Create axios instance mirroring frontend/src/utils/axios.js exactly
  const mockLocalStorage = {
    accessToken: jwt.sign({ userId: "user123" }, JWT_SECRET, { expiresIn: "-1s" }), // Already expired
    refreshToken: jwt.sign({ userId: "user123" }, REFRESH_SECRET, { expiresIn: "7d" }),
    getItem(key) { return this[key]; },
    setItem(key, val) { this[key] = val; },
    clear() { this.accessToken = null; this.refreshToken = null; }
  };

  const api = axios.create({
    baseURL: "http://localhost:9876/api",
    headers: { "Content-Type": "application/json" }
  });

  // Exactly copy request interceptor from frontend/src/utils/axios.js
  api.interceptors.request.use(
    (config) => {
      const accessToken = mockLocalStorage.getItem("accessToken");
      if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Exactly copy response interceptor from frontend/src/utils/axios.js
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url.includes("/auth/login") &&
        !originalRequest.url.includes("/auth/refresh-token")
      ) {
        originalRequest._retry = true;
        try {
          const refreshToken = mockLocalStorage.getItem("refreshToken");
          const response = await axios.post("http://localhost:9876/api/auth/refresh-token", { refreshToken });
          const { accessToken } = response.data;
          mockLocalStorage.setItem("accessToken", accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (err) {
          mockLocalStorage.clear();
          return Promise.reject(err);
        }
      }
      return Promise.reject(error);
    }
  );

  try {
    console.log("\n--- TEST 1: Single Request with Expired Access Token ---");
    refreshEndpointCallCount = 0;
    const res1 = await api.get("/test-data");
    console.log("Response 1 Result:", res1.data);
    console.log("Refreshed token stored in localStorage:", mockLocalStorage.accessToken ? "✓ YES" : "❌ NO");
    console.log("Refresh endpoint call count:", refreshEndpointCallCount);

    console.log("\n--- TEST 2: Concurrent 401 Requests (3 parallel calls with expired token) ---");
    // Expire token again
    mockLocalStorage.accessToken = jwt.sign({ userId: "user123" }, JWT_SECRET, { expiresIn: "-1s" });
    refreshEndpointCallCount = 0;

    const [p1, p2, p3] = await Promise.all([
      api.get("/test-data"),
      api.get("/test-data"),
      api.get("/test-data")
    ]);

    console.log("Concurrent Request Results:", p1.data.success, p2.data.success, p3.data.success);
    console.log(`Concurrent Refresh Endpoint Call Count: ${refreshEndpointCallCount}`);
    if (refreshEndpointCallCount > 1) {
      console.error(`❌ RACE CONDITION / DUPLICATE REFRESH: Made ${refreshEndpointCallCount} simultaneous /auth/refresh-token requests for 3 concurrent 401s!`);
    } else {
      console.log(`✓ Concurrent 401s handled cleanly with 1 refresh request.`);
    }

  } catch (err) {
    console.error("AXIOS TEST ERROR:", err.message);
  } finally {
    server.close();
  }
});
