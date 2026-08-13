/**
 * Centralized AI Provider Configuration (Phase 13.1 & Provider Migration).
 * Reads environment variables for Google Gemini provider.
 */

const getAiConfig = () => {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const timeoutMs = parseInt(process.env.GEMINI_TIMEOUT_MS, 10) || 30000;

  return {
    apiKey,
    model,
    timeoutMs,
    isConfigured: Boolean(apiKey && apiKey.trim().length > 0),
  };
};

module.exports = {
  getAiConfig,
};
