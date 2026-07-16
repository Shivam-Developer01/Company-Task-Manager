import api from "../utils/axios";

const taskService = {
  getTasks: async (params = {}) => {
    const response = await api.get("/tasks", {
      params,
    });

    return response.data;
  },

  getTask: async (id) => {
    const response = await api.get(`/tasks/${id}`);

    return response.data;
  },

  getTaskActivities: async (id) => {
    const response = await api.get(`/tasks/${id}/activities`);
    return response.data;
  },

  createTask: async (formData) => {
    const response = await api.post("/tasks", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  updateTask: async (id, formData) => {
    const response = await api.patch(`/tasks/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  toggleArchive: async (id) => {
    const response = await api.patch(`/tasks/${id}/archive`);

    return response.data;
  },

  getActivities: async (id) => {
    const response = await api.get(`/tasks/${id}/activities`);

    return response.data;
  },

  withdrawTask: async (id) => {
    const response = await api.patch(`/tasks/${id}/withdraw`);
    return response.data;
  },

  archiveTask: async (id) => {
    const response = await api.patch(`/tasks/${id}/archive`);
    return response.data;
  },

  reassignTask: async (id, assignedTo) => {
    const response = await api.patch(`/tasks/${id}/reassign`, {
      assignedTo,
    });

    return response.data;
  },
  getMyTasks: async (params = {}) => {
    const response = await api.get("/tasks/my", {
      params,
    });

    return response.data;
  },

  acceptTask: async (id) => {
    const response = await api.patch(`/tasks/${id}/accept`);
    return response.data;
  },

  rejectTask: async (id, rejectionReason) => {
    const response = await api.patch(`/tasks/${id}/reject`, {
      rejectionReason,
    });
    return response.data;
  },

  startTask: async (id) => {
    const response = await api.patch(`/tasks/${id}/start`);
    return response.data;
  },

  updateChecklist: async (taskId, checklistId) => {
    const response = await api.patch(
      `/tasks/${taskId}/checklist/${checklistId}`,
    );

    return response.data;
  },
};

export default taskService;
