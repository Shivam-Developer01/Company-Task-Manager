const {
  submitTask,
  reviewSubmission,
} = require("../services/submission/submissionManagementService");

const {
  getMySubmissions,
  getAllSubmissions,
  getSubmissionById,
} = require("../services/submission/submissionQueryService");

module.exports = {
  submitTask,
  reviewSubmission,

  getMySubmissions,
  getAllSubmissions,
  getSubmissionById,
};
