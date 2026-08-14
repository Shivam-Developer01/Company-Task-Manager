const { createClient } = require("@supabase/supabase-js");
const path = require("path");

/**
 * Supabase Storage Integration Utility.
 * Manages private file storage for references and submissions buckets.
 * Strictly server-side: process.env.SUPABASE_SECRET_KEY is never exposed to frontend.
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.warn("WARNING: Missing SUPABASE_URL or SUPABASE_SECRET_KEY in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
  },
});

const BUCKETS = {
  REFERENCES: "references",
  SUBMISSIONS: "submissions",
};

/**
 * Upload a binary buffer to a private Supabase Storage bucket.
 * @param {Object} params
 * @param {string} params.bucket Name of the private bucket ('references' or 'submissions')
 * @param {string} params.path Storage object key/path inside the bucket
 * @param {Buffer} params.fileBuffer File buffer in memory
 * @param {string} params.mimeType File MIME type
 * @returns {Promise<Object>} { storagePath, bucket }
 */
const uploadFile = async ({ bucket, path, fileBuffer, mimeType }) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error(`Supabase Upload Error [Bucket: ${bucket}, Path: ${path}]:`, error);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return {
    storagePath: data.path || path,
    bucket,
  };
};

/**
 * Generate a short-lived signed URL for a private Supabase Storage object.
 * @param {Object} params
 * @param {string} params.bucket Bucket name
 * @param {string} params.path Object key/path inside bucket
 * @param {number} [params.expiresIn=3600] Expiration time in seconds (default 1 hour)
 * @returns {Promise<string|null>} Signed URL string or null on error
 */
const createSignedUrl = async ({ bucket, path, expiresIn = 3600 }) => {
  if (!bucket || !path) return null;
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error(`Supabase Signed URL Error [Bucket: ${bucket}, Path: ${path}]:`, error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (err) {
    console.error("Failed to generate signed URL:", err);
    return null;
  }
};

/**
 * Delete a single object from a Supabase Storage bucket.
 * @param {Object} params
 * @param {string} params.bucket Bucket name
 * @param {string} params.path Object key/path inside bucket
 */
const deleteFile = async ({ bucket, path }) => {
  if (!bucket || !path) return;
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      console.error(`Supabase Delete Error [Bucket: ${bucket}, Path: ${path}]:`, error);
    }
  } catch (err) {
    console.error("Failed to delete file from Supabase:", err);
  }
};

/**
 * Bulk delete objects from a Supabase Storage bucket.
 * @param {Object} params
 * @param {string} params.bucket Bucket name
 * @param {Array<string>} params.paths Array of object keys/paths inside bucket
 */
const deleteFiles = async ({ bucket, paths }) => {
  if (!bucket || !paths || !Array.isArray(paths) || paths.length === 0) return;
  try {
    const validPaths = paths.filter(Boolean);
    if (validPaths.length === 0) return;
    const { error } = await supabase.storage.from(bucket).remove(validPaths);
    if (error) {
      console.error(`Supabase Bulk Delete Error [Bucket: ${bucket}]:`, error);
    }
  } catch (err) {
    console.error("Failed to bulk delete files from Supabase:", err);
  }
};

/**
 * Transform an attachment metadata object to include a signed URL if it uses Supabase storage,
 * while preserving legacy local file paths (/uploads/...).
 * @param {Object} attachment Attachment object from Task or Submission
 * @returns {Promise<Object>} Cloned attachment with populated fileUrl
 */
const transformAttachment = async (attachment) => {
  if (!attachment) return attachment;
  const attObj = typeof attachment.toObject === "function" ? attachment.toObject() : { ...attachment };

  if (attObj.storagePath && attObj.bucket) {
    const signedUrl = await createSignedUrl({
      bucket: attObj.bucket,
      path: attObj.storagePath,
      expiresIn: 3600,
    });
    if (signedUrl) {
      attObj.fileUrl = signedUrl;
    }
  }
  return attObj;
};

/**
 * Transform an array of attachments to include signed URLs for Supabase storage items.
 * @param {Array<Object>} attachments
 * @returns {Promise<Array<Object>>}
 */
const transformAttachments = async (attachments = []) => {
  if (!Array.isArray(attachments) || attachments.length === 0) return [];
  return Promise.all(attachments.map(transformAttachment));
};

/**
 * Safely normalize user-provided original file names to eliminate path traversal characters.
 * @param {string} originalName
 * @returns {string} Safe normalized file name
 */
const getSafeFileName = (originalName) => {
  if (!originalName) return "attachment";
  const baseName = path.basename(originalName);
  const ext = path.extname(baseName) || "";
  const nameWithoutExt = path.basename(baseName, ext);
  const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${sanitized || "file"}${ext}`;
};

module.exports = {
  supabase,
  BUCKETS,
  uploadFile,
  createSignedUrl,
  deleteFile,
  deleteFiles,
  transformAttachment,
  transformAttachments,
  getSafeFileName,
};
