
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Task = require("../models/Task");
const authMiddleware = require("../middleware/authMiddleware");

// Protect every task endpoint
router.use(authMiddleware);

// GET: Fetch only the logged-in user's tasks
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not fetch tasks.",
    });
  }
});

// POST: Create a task for the logged-in user
router.post("/", async (req, res) => {
  try {
    const { title, description, deadline, priority, category } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required.",
      });
    }

    const task = await Task.create({
      user: req.user._id,
      title: title.trim(),
      description: description || "",
      deadline: deadline || null,
      priority: priority || "Medium",
      category: category || "Other",
    });

    res.status(201).json({ success: true, task });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// PATCH: Update completion status
router.patch("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID.",
      });
    }

    if (typeof req.body.completed !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "A valid completed value is required.",
      });
    }

    const task = await Task.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
      },
      { completed: req.body.completed },
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    res.json({ success: true, task });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Could not update task.",
    });
  }
});

// PUT: Edit a task
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID.",
      });
    }

    const { title, description, deadline, priority, category } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required.",
      });
    }

    const updates = {
      title: title.trim(),
    };

    if (description !== undefined) {
      updates.description = description;
    }

    if (deadline !== undefined) {
      updates.deadline = deadline || null;
    }

    if (priority !== undefined) {
      updates.priority = priority;
    }

    if (category !== undefined) {
      updates.category = category;
    }

    const task = await Task.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
      },
      updates,
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    res.json({ success: true, task });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Could not edit task. Check the submitted values.",
    });
  }
});

// DELETE: Delete only the logged-in user's task
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID.",
      });
    }

    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    res.json({
      success: true,
      message: "Task deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not delete task.",
    });
  }
});

module.exports = router;
