const aiProvider = require("./aiProvider");
const { validateAndSanitizeForAi } = require("./aiSecurityBoundary");
const { validateAgainstSchema } = require("./aiResponseValidator");
const CustomError = require("../../errors/CustomError");

/**
 * Structured AI Response Service (Phase 13.4 & Gemini Migration).
 * Coordinates end-to-end AI execution pipeline:
 * Context -> Security Boundary -> AI Provider -> JSON Parsing -> Schema Validation.
 * NO MongoDB database access, NO database write operations.
 */

/**
 * Safely generate a structured, schema-validated AI response.
 * @param {Object} params
 * @param {Object} params.contextDto Sanitized AIContextDTO from Phase 13.2
 * @param {Object} params.schema Expected response schema definition
 * @param {number} [params.temperature=0.2] Temperature
 * @returns {Promise<Object>} Normalized validated AI response result
 */
const generateStructuredAiResponse = async ({
  contextDto,
  schema,
  temperature = 0.2,
}) => {
  if (!schema) {
    const error = new CustomError("Schema specification is required for structured AI responses.", 400);
    error.type = "AI_RESPONSE_SCHEMA_FAILED";
    throw error;
  }

  // 1. Pass Context DTO through Phase 13.3 Security Gatekeeper (Fails closed on rejection)
  const securityBundle = validateAndSanitizeForAi(contextDto);

  // Append explicit JSON schema structure to system instruction for LLM schema alignment
  const systemInstructionWithSchema = `${securityBundle.systemInstruction}

REQUIRED OUTPUT JSON SCHEMA SPECIFICATION:
You MUST respond ONLY with a valid JSON object adhering strictly to the following schema definition:
${JSON.stringify(schema, null, 2)}`;

  // 2. Invoke AI Provider with response_format: { type: "json_object" }
  const aiResult = await aiProvider.generateText({
    systemInstruction: systemInstructionWithSchema,
    userPrompt: securityBundle.userPrompt,
    responseFormat: { type: "json_object" },
    temperature,
  });

  // 3. Parse JSON Output Safely
  let parsedPayload = null;
  try {
    parsedPayload = JSON.parse(aiResult.text);
  } catch (err) {
    const error = new CustomError(
      `AI Provider returned malformed JSON response: ${err.message}`,
      502,
    );
    error.type = "AI_RESPONSE_PARSE_FAILED";
    throw error;
  }

  // 4. Auto-populate static metadata fields if omitted by AI provider
  if (parsedPayload && typeof parsedPayload === "object" && !Array.isArray(parsedPayload)) {
    if (schema.properties?.reportType && !parsedPayload.reportType) {
      if (schema.name === "AdminCompanyPerformanceReportSchema") parsedPayload.reportType = "ADMIN_COMPANY_PERFORMANCE";
      else if (schema.name === "EmployeePerformanceReportSchema") parsedPayload.reportType = "EMPLOYEE_PERFORMANCE";
      else if (schema.name === "ManagerTeamPerformanceReportSchema") parsedPayload.reportType = "MANAGER_TEAM_PERFORMANCE";
      else if (schema.name === "ProjectPerformanceReportSchema") parsedPayload.reportType = "PROJECT_PERFORMANCE";
      else if (contextDto?.contextMetadata?.reportType) parsedPayload.reportType = contextDto.contextMetadata.reportType;
    }
    if (schema.properties?.recommendationType && !parsedPayload.recommendationType) {
      if (schema.name === "TaskAssignmentRecommendationSchema") parsedPayload.recommendationType = "TASK_ASSIGNMENT";
      else if (contextDto?.contextMetadata?.recommendationType) parsedPayload.recommendationType = contextDto.contextMetadata.recommendationType;
    }
    if (schema.properties?.targetType && !parsedPayload.targetType) {
      parsedPayload.targetType = contextDto?.contextMetadata?.target?.targetType || "task";
    }
    if (schema.properties?.targetId && !parsedPayload.targetId) {
      parsedPayload.targetId = contextDto?.contextMetadata?.target?.targetId || "";
    }
  }

  // 5. Validate Parsed JSON against Expected Schema Specification
  const validatedData = validateAgainstSchema(parsedPayload, schema, schema.name || "root");

  // 5. Return Normalized Result Object
  return {
    success: true,
    data: validatedData,
    metadata: {
      schemaName: schema.name || "CustomSchema",
      schemaVersion: schema.version || "1.0",
      model: aiResult.model,
      usage: aiResult.usage,
      durationMs: aiResult.durationMs,
    },
  };
};

module.exports = {
  generateStructuredAiResponse,
};
