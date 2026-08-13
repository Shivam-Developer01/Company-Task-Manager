const geminiProvider = require("./geminiProvider");
const { getAiConfig } = require("./aiConfig");
const { validateAndSanitizeForAi } = require("./aiSecurityBoundary");

/**
 * Normalized AI Provider Facade (Phase 13.1 & 13.3 & Gemini Provider Migration).
 * Decouples application logic from the underlying AI provider implementation (Google Gemini API).
 * NO MongoDB / Mongoose database access.
 */

/**
 * Generate text using configured AI provider (Google Gemini API).
 * @param {Object} params
 * @param {string} params.systemInstruction
 * @param {string} params.userPrompt
 * @param {Object} [params.responseFormat]
 * @param {number} [params.temperature]
 */
const generateText = async ({
  systemInstruction = "",
  userPrompt = "",
  responseFormat = null,
  temperature = 0.2,
}) => {
  return await geminiProvider.generateText({
    systemInstruction,
    userPrompt,
    responseFormat,
    temperature,
  });
};

/**
 * Safely generate text from an AIContextDTO (Phase 13.3 Security Boundary Integration).
 * Passes contextDto through aiSecurityBoundary FIRST.
 * FAILS CLOSED if security boundary validation fails.
 * @param {Object} params
 * @param {Object} params.contextDto Sanitized AIContextDTO from Phase 13.2
 * @param {Object} [params.responseFormat] Optional response format
 * @param {number} [params.temperature] Optional temperature
 */
const generateTextFromContext = async ({
  contextDto,
  responseFormat = null,
  temperature = 0.2,
}) => {
  // 1. Security Gatekeeper Validation (Fails closed on security rejection)
  const securityBundle = validateAndSanitizeForAi(contextDto);

  // 2. Invoke Gemini Provider with sanitized system instruction and boundary-wrapped prompt
  return await geminiProvider.generateText({
    systemInstruction: securityBundle.systemInstruction,
    userPrompt: securityBundle.userPrompt,
    responseFormat,
    temperature,
  });
};

/**
 * Check provider configuration and health status.
 */
const checkHealth = async () => {
  const config = getAiConfig();
  const providerHealth = await geminiProvider.checkHealth();
  return {
    ...providerHealth,
    timeoutMs: config.timeoutMs,
  };
};

module.exports = {
  generateText,
  generateTextFromContext,
  checkHealth,
};
