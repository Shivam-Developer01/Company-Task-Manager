import api from "../utils/axios";

const departmentService = {
  getDepartments: async (params = {}) => {
    const response = await api.get("/departments", { params });
    return response.data;
  },

  getDepartment: async (id) => {
    const response = await api.get(`/departments/${id}`);
    return response.data;
  },

  createDepartment: async (data) => {
    const response = await api.post("/departments", data);
    return response.data;
  },

  updateDepartment: async (id, data) => {
    const response = await api.patch(`/departments/${id}`, data);
    return response.data;
  },

  toggleStatus: async (id) => {
    const response = await api.patch(`/departments/${id}/status`);
    return response.data;
  },
};

export default departmentService;
