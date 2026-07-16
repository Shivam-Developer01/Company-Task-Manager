import api from "../utils/axios";

const submissionService = {
  /* ===========================
          EMPLOYEE
  =========================== */

  submitTask: async (taskId, formData) => {
    const response = await api.post(`/submissions/${taskId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  getMySubmissions: async (params = {}) => {
    const response = await api.get("/submissions/my", {
      params,
    });

    return response.data;
  },

  /* ===========================
          MANAGER
  =========================== */

  getSubmissions: async (params = {}) => {
    const response = await api.get("/submissions", {
      params,
    });

    return response.data;
  },

  getSubmission: async (id) => {
    const response = await api.get(`/submissions/${id}`);

    return response.data;
  },

  reviewSubmission: async (id, action, feedback = "") => {
    const response = await api.patch(`/submissions/${id}/review`, {
      action,
      feedback,
    });

    return response.data;
  },
};

export default submissionService;
