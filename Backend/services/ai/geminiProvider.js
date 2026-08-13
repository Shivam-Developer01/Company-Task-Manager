const { GoogleGenAI } = require("@google/genai");
const { getAiConfig } = require("./aiConfig");
const CustomError = require("../../errors/CustomError");

/**
 * Google Gemini API Provider Implementation (Provider Migration).
 * Handles generative text & structured JSON content generation via official @google/genai SDK.
 * NO MongoDB / Mongoose database access.
 */

/**
 * Generate normalized AI response using Google Gemini API.
 * @param {Object} params
 * @param {string} [params.systemInstruction=""] System-level instructions
 * @param {string} [params.userPrompt=""] User/Application text input
 * @param {Object} [params.responseFormat=null] Optional response format e.g. { type: "json_object" }
 * @param {number} [params.temperature=0.2] Temperature (default: 0.2)
 * @returns {Promise<Object>} Normalized AI output { text, model, finishReason, usage, durationMs }
 */
const generateText = async ({
  systemInstruction = "",
  userPrompt = "",
  responseFormat = null,
  temperature = 0.2,
}) => {
  const config = getAiConfig();

  if (!config.isConfigured) {
    const error = new CustomError(
      "AI Provider API key is not configured. Please set GEMINI_API_KEY in Backend/.env.",
      503
    );
    error.type = "AI_NOT_CONFIGURED";
    throw error;
  }

  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const startTime = Date.now();

  const reqConfig = {
    temperature,
  };

  if (systemInstruction && systemInstruction.trim().length > 0) {
    reqConfig.systemInstruction = systemInstruction;
  }

  if (responseFormat && responseFormat.type === "json_object") {
    reqConfig.responseMimeType = "application/json";
  }

  try {
    const generatePromise = ai.models.generateContent({
      model: config.model,
      contents: userPrompt || "",
      config: reqConfig,
    });

    // Timeout signal handling
    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        const err = new CustomError(
          `AI Provider request timed out after ${config.timeoutMs}ms.`,
          504
        );
        err.type = "AI_TIMEOUT";
        reject(err);
      }, config.timeoutMs);

      // Prevent holding event loop
      if (timer.unref) timer.unref();
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const durationMs = Date.now() - startTime;

    const rawText = response?.text || "";

    // Usage metadata normalization if available
    const usageMetadata = response?.usageMetadata || null;
    const usage = usageMetadata
      ? {
          inputTokens: usageMetadata.promptTokenCount || 0,
          outputTokens: usageMetadata.candidatesTokenCount || 0,
          totalTokens: usageMetadata.totalTokenCount || 0,
        }
      : null;

    const finishReason =
      response?.candidates?.[0]?.finishReason || "STOP";

    console.log(
      `[AI Provider: Gemini] Request completed in ${durationMs}ms | Model: ${config.model} | Finish: ${finishReason}`
    );

    return {
      text: rawText,
      model: config.model,
      finishReason,
      usage,
      durationMs,
    };
  } catch (err) {
    // Re-throw if already CustomError
    if (err instanceof CustomError) {
      throw err;
    }

    const errMsg = err.message || String(err);
    const status = err.status || err.statusCode || 500;

    if (status === 401 || status === 403 || /api_key|unauthorized|forbidden|permission|quota/i.test(errMsg)) {
      const error = new CustomError(
        `AI Provider authentication/credential error: ${errMsg}`,
        502
      );
      error.type = "AI_AUTHENTICATION_ERROR";
      throw error;
    }

    if (status === 429 || /rate_limit|resource_exhausted/i.test(errMsg)) {
      const error = new CustomError(
        `AI Provider rate limit exceeded: ${errMsg}`,
        429
      );
      error.type = "AI_RATE_LIMITED";
      throw error;
    }

    const error = new CustomError(`AI Provider error: ${errMsg}`, 502);
    error.type = "AI_PROVIDER_ERROR";
    throw error;
  }
};

/**
 * Health check helper for Gemini provider connectivity.
 */
const checkHealth = async () => {
  const config = getAiConfig();
  return {
    provider: "Google Gemini",
    model: config.model,
    isConfigured: config.isConfigured,
  };
};

module.exports = {
  generateText,
  checkHealth,
};
