import api from "../utils/axios";

const userService = {
  getUsers: async (params = {}) => {
    const response = await api.get("/auth/users", {
      params,
    });

    return response.data;
  },

  getUser: async (id) => {
    const response = await api.get(`/auth/users/${id}`);

    return response.data;
  },

  createUser: async (user) => {
    const response = await api.post("/auth/users", user);

    return response.data;
  },

  updateUser: async (id, user) => {
    const response = await api.patch(`/auth/users/${id}`, user);

    return response.data;
  },

  toggleStatus: async (id) => {
    const response = await api.patch(`/auth/users/${id}/status`);

    return response.data;
  },

  resetPassword: async (id) => {
    const response = await api.patch(`/auth/users/${id}/reset-password`);

    return response.data;
  },

  getUserOptions: async (params = {}) => {
    const response = await api.get("/auth/users/options", {
      params,
    });

    return response.data;
  },
};

export default userService;
