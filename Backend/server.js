require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");

const connectDB = require("./db/connect");

const taskRoutes = require("./routes/taskRoutes");
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const designationRoutes = require("./routes/designationRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const aiRoutes = require("./routes/aiRoutes");

const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(express.json());

app.use(helmet());

app.use(compression());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/designations", designationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ai", aiRoutes);

app.use(errorHandler);

const { initDepartmentSnapshotScheduler } = require("./services/analytics/departmentSnapshotScheduler");

const start = async () => {
  try {
    await connectDB();

    // Initialize automatic monthly department snapshot scheduler
    initDepartmentSnapshotScheduler();

    app.listen(3000, () => {
      console.log("Server running on port 3000");
    });
  } catch (error) {
    console.log(error);
  }
};

start();
