import api from "../utils/axios";

const designationService = {
  getDesignations: async (params = {}) => {
    const response = await api.get("/designations", {
      params,
    });

    return response.data;
  },

  getDesignation: async (id) => {
    const response = await api.get(`/designations/${id}`);
    return response.data;
  },

  createDesignation: async (data) => {
    const response = await api.post("/designations", data);
    return response.data;
  },

  updateDesignation: async (id, data) => {
    const response = await api.patch(`/designations/${id}`, data);
    return response.data;
  },

  toggleStatus: async (id) => {
    const response = await api.patch(`/designations/${id}/status`);
    return response.data;
  },
};

export default designationService;
