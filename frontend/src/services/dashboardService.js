import api from "../utils/axios";

const dashboardService = {
  getDashboard: async (project = "") => {
    const user = JSON.parse(localStorage.getItem("user"));

    let endpoint = "/dashboard/employee";

    if (user.role === "manager" || user.role === "admin") {
      endpoint = "/dashboard/manager";
    }

    const response = await api.get(endpoint, {
      params: {
        project,
      },
    });

    return response.data;
  },
};

export default dashboardService;
