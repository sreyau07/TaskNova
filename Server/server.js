const authRoutes = require("./routes/AuthRoutes");
const express = require("express");
const cors = require("cors");
const taskRoutes = require("./routes/TaskRoutes");
const connectDB = require("./config/db");
const profileRoutes = require("./routes/ProfileRoutes");
require("dotenv").config();


const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/profile", profileRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "TaskNova API is running!",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is healthy",
  });
});

const PORT = process.env.PORT || 5000;




const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`TaskNova server running on port ${PORT}`);
  });
};

startServer();

