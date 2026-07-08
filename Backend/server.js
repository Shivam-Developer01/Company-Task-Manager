require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./db/connect");

const taskRoutes = require("./routes/taskRoutes");

const authRoutes = require("./routes/authRoutes");

const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/auth", authRoutes);

app.use("/api/tasks", taskRoutes);

app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();

    app.listen(3000, () => {
      console.log("Server running on port 3000");
    });
  } catch (error) {
    console.log(error);
  }
};

start();
