const CustomError = require("../../errors/CustomError");

/**
 * Generic AI Response Schema Validation Engine & XSS Sanitizer (Phase 13.4).
 * Ensures AI outputs match strict application schemas and contain clean, safe text.
 * NO MongoDB / Mongoose database access.
 */

/**
 * Sanitize string output from AI to prevent XSS or script injection.
 * Removes script tags, inline handlers, and executable code snippets.
 * @param {string} str Raw AI output string
 * @returns {string} Clean plain text string
 */
const sanitizeAiString = (str) => {
  if (typeof str !== "string") {
    return str;
  }

  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/on\w+\s*=\s*'[^']*'/gi, "")
    .replace(/[\r\n]+/g, " ")
    .trim();
};

/**
 * Validate a data payload against an expected schema definition.
 * @param {*} data Parsed JSON payload from AI provider
 * @param {Object} schema Schema specification
 * @param {string} [path="root"] Path tracer for error reporting
 * @returns {*} Validated and sanitized output object
 */
const validateAgainstSchema = (data, schema, path = "root") => {
  if (!schema || !schema.type) {
    const error = new CustomError(`Invalid schema specification at ${path}.`, 500);
    error.type = "AI_RESPONSE_SCHEMA_FAILED";
    throw error;
  }

  // 1. Handle Null / Undefined
  if (data === null || data === undefined) {
    if (schema.required) {
      const error = new CustomError(`AI Response Schema Error: Field "${path}" is required but missing.`, 502);
      error.type = "AI_RESPONSE_SCHEMA_FAILED";
      throw error;
    }
    return null;
  }

  // 2. Type Check
  const actualType = Array.isArray(data) ? "array" : typeof data;

  if (schema.type === "number" && actualType !== "number") {
    // Attempt string-to-number parse if strictType is false
    const parsedNum = Number(data);
    if (isNaN(parsedNum)) {
      const error = new CustomError(`AI Response Schema Error: Field "${path}" expected number, got ${typeof data}.`, 502);
      error.type = "AI_RESPONSE_SCHEMA_FAILED";
      throw error;
    }
    data = parsedNum;
  } else if (schema.type !== actualType && !(schema.type === "number" && typeof data === "number")) {
    const error = new CustomError(`AI Response Schema Error: Field "${path}" expected ${schema.type}, got ${actualType}.`, 502);
    error.type = "AI_RESPONSE_SCHEMA_FAILED";
    throw error;
  }

  // 3. String Specific Validation & Sanitization
  if (schema.type === "string") {
    let cleanStr = sanitizeAiString(data);

    if (schema.enum && Array.isArray(schema.enum)) {
      if (!schema.enum.includes(cleanStr)) {
        const error = new CustomError(
          `AI Response Schema Error: Field "${path}" value "${cleanStr}" is not in allowed set: [${schema.enum.join(", ")}].`,
          502,
        );
        error.type = "AI_RESPONSE_SCHEMA_FAILED";
        throw error;
      }
    }

    if (schema.minLength !== undefined && cleanStr.length < schema.minLength) {
      const error = new CustomError(
        `AI Response Schema Error: Field "${path}" string length (${cleanStr.length}) is below minLength (${schema.minLength}).`,
        502,
      );
      error.type = "AI_RESPONSE_SCHEMA_FAILED";
      throw error;
    }

    if (schema.maxLength !== undefined && cleanStr.length > schema.maxLength) {
      const error = new CustomError(
        `AI Response Schema Error: Field "${path}" string length (${cleanStr.length}) exceeds maxLength (${schema.maxLength}).`,
        502,
      );
      error.type = "AI_RESPONSE_SCHEMA_FAILED";
      throw error;
    }

    return cleanStr;
  }

  // 4. Number Specific Validation
  if (schema.type === "number") {
    if (schema.min !== undefined && data < schema.min) {
      const error = new CustomError(
        `AI Response Schema Error: Field "${path}" value (${data}) is below min range (${schema.min}).`,
        502,
      );
      error.type = "AI_RESPONSE_SCHEMA_FAILED";
      throw error;
    }

    if (schema.max !== undefined && data > schema.max) {
      const error = new CustomError(
        `AI Response Schema Error: Field "${path}" value (${data}) exceeds max range (${schema.max}).`,
        502,
      );
      error.type = "AI_RESPONSE_SCHEMA_FAILED";
      throw error;
    }

    return data;
  }

  // 5. Array Specific Validation
  if (schema.type === "array") {
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      const error = new CustomError(
        `AI Response Schema Error: Array "${path}" length (${data.length}) exceeds maxItems (${schema.maxItems}).`,
        502,
      );
      error.type = "AI_RESPONSE_SCHEMA_FAILED";
      throw error;
    }

    if (schema.items) {
      return data.map((item, idx) => validateAgainstSchema(item, schema.items, `${path}[${idx}]`));
    }
    return data;
  }

  // 6. Object Specific Validation
  if (schema.type === "object" && schema.properties) {
    const validatedObj = {};

    // Validate required & present properties defined in schema
    for (const [propKey, propSchema] of Object.entries(schema.properties)) {
      const propValue = data[propKey];
      validatedObj[propKey] = validateAgainstSchema(propValue, propSchema, `${path}.${propKey}`);
    }

    return validatedObj;
  }

  return data;
};

/**
 * Standard test schema for verifying the structured response engine (Phase 13.4).
 */
const TEST_RESPONSE_SCHEMA = {
  name: "TestResponseSchema",
  version: "1.0",
  type: "object",
  properties: {
    status: {
      type: "string",
      required: true,
      enum: ["ok", "completed", "error"],
    },
    summary: {
      type: "string",
      required: true,
      minLength: 1,
      maxLength: 1000,
    },
    confidenceScore: {
      type: "number",
      required: false,
      min: 0,
      max: 100,
    },
  },
};

module.exports = {
  sanitizeAiString,
  validateAgainstSchema,
  TEST_RESPONSE_SCHEMA,
};
