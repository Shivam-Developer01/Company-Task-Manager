const Submission = require("../../models/Submission");
const CustomError = require("../../errors/CustomError");
const { ROLES } = require("../../constants/constants");
const { getAccessibleTaskIds } = require("./taskAccess");

const getSubmissionFilter = async (user) => {
  switch (user.role) {
    case ROLES.ADMIN:
      return {};

    case ROLES.EMPLOYEE:
      return {
        submittedBy: user.userId,
      };

    case ROLES.MANAGER: {
      const taskIds = await getAccessibleTaskIds(user);

      if (!taskIds.length) {
        return {
          _id: null,
        };
      }

      return {
        task: {
          $in: taskIds,
        },
      };
    }

    default:
      return {
        _id: null,
      };
  }
};

const getAccessibleSubmission = async (submissionId, user) => {
  const filter = await getSubmissionFilter(user);

  const submission = await Submission.findOne({
    _id: submissionId,
    ...filter,
  });

  if (!submission) {
    throw new CustomError("NOT FOUND", "SUBMISSION NOT FOUND");
  }

  return submission;
};

module.exports = {
  getSubmissionFilter,
  getAccessibleSubmission,
};
