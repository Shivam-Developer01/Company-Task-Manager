const path = require("path");
const http = require("http");

module.paths.push(path.join(__dirname, "../Backend/node_modules"));
module.paths.push(path.join(__dirname, "../frontend/node_modules"));

const jwt = require(path.join(__dirname, "../Backend/node_modules/jsonwebtoken"));
const axios = require(path.join(__dirname, "../frontend/node_modules/axios"));

const JWT_SECRET = "test_jwt_secret_456";
const REFRESH_SECRET = "test_refresh_secret_456";

let refreshCallCount = 0;
let shouldRefreshFail = false;

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.url === "/api/auth/refresh-token" && req.method === "POST") {
    refreshCallCount++;
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      if (shouldRefreshFail) {
        res.writeHead(401);
        res.end(JSON.stringify({ success: false, message: "Invalid or expired refresh token" }));
      } else {
        const newAccessToken = jwt.sign({ userId: "user123" }, JWT_SECRET, { expiresIn: "15m" });
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, accessToken: newAccessToken }));
      }
    });
    return;
  }

  if (req.url.startsWith("/api/data-")) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    try {
      if (!token) throw new Error("No token");
      jwt.verify(token, JWT_SECRET);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, url: req.url }));
    } catch (err) {
      res.writeHead(401);
      res.end(JSON.stringify({ success: false, message: "Token expired" }));
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(9877, async () => {
  console.log("=== STARTING CONCURRENT 401 REFRESH MECHANISM AUDIT & TEST ===\n");

  const mockLocalStorage = {
    accessToken: jwt.sign({ userId: "user123" }, JWT_SECRET, { expiresIn: "-1s" }),
    refreshToken: jwt.sign({ userId: "user123" }, REFRESH_SECRET, { expiresIn: "7d" }),
    getItem(key) { return this[key]; },
    setItem(key, val) { this[key] = val; },
    clear() { this.accessToken = null; this.refreshToken = null; }
  };

  // Build client using exact code structure of frontend/src/utils/axios.js
  let isRefreshing = false;
  let failedQueue = [];

  const processQueue = (error, token = null) => {
    failedQueue.forEach((promise) => {
      if (error) promise.reject(error);
      else promise.resolve(token);
    });
    failedQueue = [];
  };

  const api = axios.create({
    baseURL: "http://localhost:9877/api",
    headers: { "Content-Type": "application/json" }
  });

  api.interceptors.request.use(
    (config) => {
      const accessToken = mockLocalStorage.getItem("accessToken");
      if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
      return config;
    },
    (error) => Promise.reject(error)
  );

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
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = mockLocalStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token available");

        const response = await axios.post("http://localhost:9877/api/auth/refresh-token", { refreshToken });
        const { accessToken } = response.data;
        if (!accessToken) throw new Error("Invalid access token returned");

        mockLocalStorage.setItem("accessToken", accessToken);
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        mockLocalStorage.clear();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
  );

  try {
    // 1. Test 10 Simultaneous 401 Requests — Refresh Success Scenario
    console.log("--- TEST 1: 10 Simultaneous 401 Requests (Refresh Success) ---");
    refreshCallCount = 0;
    shouldRefreshFail = false;
    mockLocalStorage.accessToken = jwt.sign({ userId: "user123" }, JWT_SECRET, { expiresIn: "-1s" });

    const requests = Array.from({ length: 10 }, (_, i) => api.get(`/data-${i + 1}`));
    const results = await Promise.all(requests);

    const successfulRetries = results.filter((r) => r.data && r.data.success).length;

    console.log(`Simultaneous 401 Requests Sent: 10`);
    console.log(`Actual POST /auth/refresh-token Calls: ${refreshCallCount}`);
    console.log(`Successfully Retried Original Requests: ${successfulRetries} / 10`);
    console.log(`New Access Token Stored in localStorage: ${mockLocalStorage.accessToken ? "✓ YES" : "❌ NO"}`);

    if (refreshCallCount === 1 && successfulRetries === 10) {
      console.log("✓ TEST 1 PASSED: Exactly 1 refresh request was made for 10 parallel 401s, and all 10 requests were successfully retried!");
    } else {
      console.error("❌ TEST 1 FAILED!");
    }

    // 2. Test 10 Simultaneous 401 Requests — Refresh Failure Scenario
    console.log("\n--- TEST 2: 10 Simultaneous 401 Requests (Refresh Failure) ---");
    refreshCallCount = 0;
    shouldRefreshFail = true;
    mockLocalStorage.accessToken = jwt.sign({ userId: "user123" }, JWT_SECRET, { expiresIn: "-1s" });

    let rejectedCount = 0;
    const failRequests = Array.from({ length: 10 }, (_, i) =>
      api.get(`/data-${i + 1}`).catch(() => {
        rejectedCount++;
      })
    );
    await Promise.all(failRequests);

    console.log(`Simultaneous 401 Requests Sent: 10`);
    console.log(`Actual POST /auth/refresh-token Calls: ${refreshCallCount}`);
    console.log(`Rejected Queued Requests: ${rejectedCount} / 10`);
    console.log(`localStorage Cleared: ${mockLocalStorage.accessToken === null && mockLocalStorage.refreshToken === null ? "✓ YES" : "❌ NO"}`);

    if (refreshCallCount === 1 && rejectedCount === 10 && mockLocalStorage.accessToken === null) {
      console.log("✓ TEST 2 PASSED: Exactly 1 refresh request was made, all 10 queued requests were cleanly rejected, and localStorage was cleared!");
    } else {
      console.error("❌ TEST 2 FAILED!");
    }

    // 3. Test Normal Single Request Auto-Refresh
    console.log("\n--- TEST 3: Normal Single-Request Auto Refresh ---");
    refreshCallCount = 0;
    shouldRefreshFail = false;
    mockLocalStorage.accessToken = jwt.sign({ userId: "user123" }, JWT_SECRET, { expiresIn: "-1s" });
    mockLocalStorage.refreshToken = jwt.sign({ userId: "user123" }, REFRESH_SECRET, { expiresIn: "7d" });

    const singleRes = await api.get("/data-single");
    console.log(`Single Request Success: ${singleRes.data.success}`);
    console.log(`Refresh Endpoint Calls: ${refreshCallCount}`);
    if (singleRes.data.success && refreshCallCount === 1) {
      console.log("✓ TEST 3 PASSED: Single request auto-refresh works cleanly!");
    } else {
      console.error("❌ TEST 3 FAILED!");
    }

  } catch (err) {
    console.error("TEST EXECUTION ERROR:", err);
  } finally {
    server.close();
  }
});
