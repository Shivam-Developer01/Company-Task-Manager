import api from "../utils/axios";

const profileService = {
  getProfile: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  changePassword: async (data) => {
    const response = await api.patch("/auth/change-password", data);
    return response.data;
  },
};

export default profileService;
