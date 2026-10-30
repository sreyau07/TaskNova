
import { useState } from "react";
import API from "./services/api";
import "./Auth.css";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  const changeMode = (nextMode) => {
    clearMessages();
    setMode(nextMode);
    setPassword("");
    setNewPassword("");
    setCode("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      let response;

      if (mode === "register") {
        response = await API.post("/auth/register", {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        });

        setMessage(response.data.message || "Check your email for the verification code.");
        setMode("verify");
      } else if (mode === "verify") {
        response = await API.post("/auth/verify-email", {
          email: email.trim().toLowerCase(),
          code: code.trim(),
        });

        setMessage(response.data.message || "Email verified. Please sign in.");
        setMode("login");
        setPassword("");
        setCode("");
      } else if (mode === "forgot") {
        response = await API.post("/auth/forgot-password", {
          email: email.trim().toLowerCase(),
        });

        setMessage(response.data.message || "Check your email if the account exists.");
        setMode("reset");
        setCode("");
      } else if (mode === "reset") {
        response = await API.post("/auth/reset-password", {
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword,
        });

        setMessage(response.data.message || "Password reset. Please sign in.");
        setMode("login");
        setPassword("");
        setNewPassword("");
        setCode("");
      } else {
        response = await API.post("/auth/login", {
          email: email.trim().toLowerCase(),
          password,
        });

        const { token, user } = response.data;

        if (!token || !user) {
          throw new Error("Login response is incomplete.");
        }

        localStorage.setItem("token", token);
        localStorage.setItem("tasknova-user", JSON.stringify(user));
        onLogin?.(user);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    clearMessages();
    setLoading(true);

    try {
      const response = await API.post("/auth/resend-verification", {
        email: email.trim().toLowerCase(),
      });
      setMessage(response.data.message || "Verification code requested.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend the code.");
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    login: "Welcome back",
    register: "Create your account",
    verify: "Verify your email",
    forgot: "Forgot your password?",
    reset: "Reset your password",
  };

  const descriptions = {
    login: "Sign in to manage your tasks.",
    register: "Create an account to organize your day.",
    verify: `Enter the six-digit code sent to ${email}.`,
    forgot: "Enter your registered email address.",
    reset: "Enter your reset code and choose a new password.",
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">T</div>
          <span>TaskNova</span>
        </div>

        <div className="auth-heading">
          <h1>{titles[mode]}</h1>
          <p>{descriptions[mode]}</p>
        </div>

        {message && <div className="auth-message success" role="status">{message}</div>}
        {error && <div className="auth-message failure" role="alert">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label>
              Full name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                maxLength={80}
                required
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              maxLength={254}
              readOnly={mode === "verify" || mode === "reset"}
              required
            />
          </label>

          {(mode === "login" || mode === "register") && (
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                minLength={mode === "register" ? 8 : undefined}
                required
              />
            </label>
          )}

          {(mode === "verify" || mode === "reset") && (
            <label>
              Six-digit code
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoComplete="one-time-code"
                required
              />
            </label>
          )}

          {mode === "reset" && (
            <label>
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
          )}

          {mode === "login" && (
            <button type="button" className="auth-text-button" onClick={() => changeMode("forgot")}>
              Forgot password?
            </button>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Please wait..." : {
              login: "Sign In",
              register: "Create Account",
              verify: "Verify Email",
              forgot: "Send Reset Code",
              reset: "Reset Password",
            }[mode]}
          </button>
        </form>

        {mode === "verify" && (
          <button type="button" className="auth-text-button auth-secondary" onClick={handleResend} disabled={loading}>
            Resend verification code
          </button>
        )}

        {mode === "reset" && (
          <button type="button" className="auth-text-button auth-secondary" onClick={() => changeMode("forgot")}>
            Request another reset code
          </button>
        )}

        <div className="auth-footer">
          {mode === "login" && (
            <>
              Don't have an account?{" "}
              <button type="button" className="auth-text-button" onClick={() => changeMode("register")}>Create one</button>
            </>
          )}

          {mode === "register" && (
            <>
              Already have an account?{" "}
              <button type="button" className="auth-text-button" onClick={() => changeMode("login")}>Sign in</button>
            </>
          )}

          {(mode === "verify" || mode === "forgot" || mode === "reset") && (
            <button type="button" className="auth-text-button" onClick={() => changeMode("login")}>Back to sign in</button>
          )}
        </div>

        <p className="auth-security">Your tasks are private to your account.</p>
      </section>
    </main>
  );
}
