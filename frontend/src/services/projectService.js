import api from "../utils/axios";

const projectService = {
  getProjects: async (params = {}) => {
    const response = await api.get("/projects", { params });
    return response.data;
  },

  getProject: async (id) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  createProject: async (data) => {
    const response = await api.post("/projects", data);
    return response.data;
  },

  updateProject: async (id, data) => {
    const response = await api.patch(`/projects/${id}`, data);
    return response.data;
  },

  toggleStatus: async (id) => {
    const response = await api.patch(`/projects/${id}/status`);
    return response.data;
  },
};

export default projectService;
