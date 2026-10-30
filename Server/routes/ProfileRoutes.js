
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");

router.use(authMiddleware);

// GET: View logged-in user's profile
router.get("/", async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "_id name email profilePhoto bio createdAt"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not fetch profile.",
    });
  }
});

// PUT: Update logged-in user's profile
router.put("/", async (req, res) => {
  try {
    const { name, bio, profilePhoto } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty.",
        });
      }

      updates.name = name.trim();
    }

    if (bio !== undefined) {
      if (typeof bio !== "string") {
        return res.status(400).json({
          success: false,
          message: "Bio must be text.",
        });
      }

      updates.bio = bio.trim();
    }

    if (profilePhoto !== undefined) {
      if (typeof profilePhoto !== "string") {
        return res.status(400).json({
          success: false,
          message: "Profile photo must be a URL string.",
        });
      }

      updates.profilePhoto = profilePhoto.trim();
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    ).select("_id name email profilePhoto bio createdAt");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully.",
      user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Could not update profile.",
    });
  }
});

module.exports = router;
