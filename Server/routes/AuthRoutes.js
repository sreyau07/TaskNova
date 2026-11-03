
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const User = require("../models/User");

const router = express.Router();

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function createCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function createToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    profilePhoto: user.profilePhoto || "",
    bio: user.bio || "",
  };
}



const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

async function sendCodeEmail(email, subject, code, purpose) {
  const mailOptions = {
    from: `"TaskNova" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: subject,
    text:
      `Your TaskNova ${purpose} code is ${code}.\n\n` +
      "This code expires in 10 minutes. Do not share it with anyone.",
  };

  const info = await transporter.sendMail(mailOptions);

  console.log("Email sent successfully:", info.messageId);

  return info;
}

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must contain 8 to 128 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.emailVerified
          ? "An account with this email already exists. Please log in."
          : "An account already exists. Request a new verification code.",
      });
    }

    const code = createCode();

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      emailVerified: false,
      emailVerificationCodeHash: hashCode(code),
      emailVerificationExpires: new Date(Date.now() + CODE_EXPIRY_MS),
    });

    try {
      await sendCodeEmail(
        normalizedEmail,
        "Verify your TaskNova email",
        code,
        "email verification"
      );
    } catch (mailError) {
      console.error("Verification email failed:", mailError.message);

      return res.status(503).json({
        success: false,
        message:
          "Your account was created, but the verification email could not be sent. Use Resend verification code to try again.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Verification code sent to your email.",
      email: normalizedEmail,
      requiresVerification: true,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not create account.",
    });
  }
});

// VERIFY EMAIL
router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof code !== "string" ||
      !/^\d{6}$/.test(code)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter your email and six-digit verification code.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+emailVerificationCodeHash +emailVerificationExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code.",
      });
    }

    if (user.emailVerified) {
      return res.json({
        success: true,
        message: "Email is already verified. You can log in.",
      });
    }

    if (
      !user.emailVerificationCodeHash ||
      !user.emailVerificationExpires ||
      user.emailVerificationExpires.getTime() < Date.now() ||
      hashCode(code) !== user.emailVerificationCodeHash
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code.",
      });
    }

    user.emailVerified = true;
    user.emailVerificationCodeHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return res.json({
      success: true,
      message: "Email verified. You can now log in.",
    });
  } catch (error) {
    console.error("Email verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not verify email.",
    });
  }
});

// RESEND VERIFICATION CODE
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body || {};

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+emailVerificationCodeHash +emailVerificationExpires");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found. Please register first.",
      });
    }

    if (user.emailVerified) {
      return res.json({
        success: true,
        message: "Email is already verified. Please log in.",
      });
    }

    const code = createCode();

    user.emailVerificationCodeHash = hashCode(code);
    user.emailVerificationExpires = new Date(Date.now() + CODE_EXPIRY_MS);
    await user.save();

    try {
      await sendCodeEmail(
        user.email,
        "Your TaskNova verification code",
        code,
        "email verification"
      );
    } catch (mailError) {
      console.error("Resend email failed:", mailError.message);

      return res.status(503).json({
        success: false,
        message: "Could not send the email. Please try again later.",
      });
    }

    return res.json({
      success: true,
      message: "A new verification code has been sent.",
    });
  } catch (error) {
    console.error("Resend verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not resend verification code.",
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.emailVerified !== true) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in.",
        requiresVerification: true,
        email: user.email,
      });
    }

    const token = createToken(user._id.toString());

    return res.json({
      success: true,
      message: "Login successful.",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not log in.",
    });
  }
});

// FORGOT PASSWORD
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
      emailVerified: true,
    }).select("+passwordResetCodeHash +passwordResetExpires");

    // Same response whether or not the account exists.
    const responseMessage =
      "If a verified account exists for this email, a password-reset code has been sent.";

    if (!user) {
      return res.json({ success: true, message: responseMessage });
    }

    const code = createCode();

    user.passwordResetCodeHash = hashCode(code);
    user.passwordResetExpires = new Date(Date.now() + CODE_EXPIRY_MS);
    await user.save();

    try {
      await sendCodeEmail(
        normalizedEmail,
        "Reset your TaskNova password",
        code,
        "password reset"
      );
    } catch (mailError) {
      console.error("Password reset email failed:", mailError.message);

      user.passwordResetCodeHash = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      return res.status(503).json({
        success: false,
        message: "Could not send the reset email. Please try again later.",
      });
    }

    return res.json({ success: true, message: responseMessage });
  } catch (error) {
    console.error("Forgot password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not process the password-reset request.",
    });
  }
});

// RESET PASSWORD
router.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof code !== "string" ||
      !/^\d{6}$/.test(code) ||
      typeof newPassword !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Email, six-digit reset code, and new password are required.",
      });
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must contain 8 to 128 characters.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      emailVerified: true,
    }).select("+passwordResetCodeHash +passwordResetExpires");

    if (
      !user ||
      !user.passwordResetCodeHash ||
      !user.passwordResetExpires ||
      user.passwordResetExpires.getTime() < Date.now() ||
      hashCode(code) !== user.passwordResetCodeHash
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password-reset code.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.passwordResetCodeHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.json({
      success: true,
      message: "Password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    console.error("Password reset error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not reset password.",
    });
  }
});

module.exports = router;
