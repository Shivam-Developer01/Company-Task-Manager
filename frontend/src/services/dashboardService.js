import api from "../utils/axios";

const dashboardService = {
  getDashboard: async () => {
    const user = JSON.parse(localStorage.getItem("user"));

    const endpoint =
      user.role === "manager" ? "/dashboard/manager" : "/dashboard/employee";

    const response = await api.get(endpoint);

    return response.data;
  },

  getEmployeeDashboard: async () => {
    const response = await api.get("/dashboard/employee");

    return response.data;
  },
};

export default dashboardService;
