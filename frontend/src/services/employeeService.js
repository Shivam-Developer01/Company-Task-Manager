import api from "../utils/axios";

const employeeService = {
  getEmployees: async (params = {}) => {
    const response = await api.get("/auth/employees", {
      params,
    });

    return response.data;
  },

  getEmployee: async (id) => {
    const response = await api.get(`/auth/employees/${id}`);

    return response.data;
  },

  createEmployee: async (employee) => {
    const response = await api.post("/auth/employees", employee);

    return response.data;
  },

  updateEmployee: async (id, employee) => {
    const response = await api.patch(`/auth/employees/${id}`, employee);

    return response.data;
  },

  toggleStatus: async (id) => {
    const response = await api.patch(`/auth/employees/${id}/status`);

    return response.data;
  },

  resetPassword: async (id) => {
    const response = await api.patch(`/auth/employees/${id}/reset-password`);

    return response.data;
  },
};

export default employeeService;
