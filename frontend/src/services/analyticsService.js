import api from "../utils/axios";

const analyticsService = {
  getCompanyAnalytics: async () => {
    const response = await api.get("/analytics/company");
    return response.data;
  },

  getManagerTeamAnalytics: async () => {
    const response = await api.get("/analytics/manager/team");
    return response.data;
  },

  getMyEmployeeAnalytics: async () => {
    const response = await api.get("/analytics/employee/me");
    return response.data;
  },

  getEmployeeAnalyticsById: async (employeeId) => {
    const response = await api.get(`/analytics/employee/${employeeId}`);
    return response.data;
  },
};

export default analyticsService;
