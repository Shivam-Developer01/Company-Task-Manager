import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout/AuthLayout";
import "../../styles/Auth.css";
import { useNotification } from "../../context/NotificationContext";
import useForm from "../../hooks/useForm";
import authService from "../../services/authService";
import { FiEye, FiEyeOff } from "react-icons/fi";

function Login() {
  const navigate = useNavigate();
  const { refreshUnreadCount } = useNotification();

  const [apiError, setApiError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { formData, handleChange, resetForm } = useForm({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email.";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required.";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const clearFieldError = (field) => {
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setApiError("");

    if (!validateForm()) return;

    try {
      const response = await authService.login(formData);

      localStorage.setItem("accessToken", response.accessToken);

      localStorage.setItem("refreshToken", response.refreshToken);

      localStorage.setItem("user", JSON.stringify(response.user));
      
      await refreshUnreadCount();

      resetForm();
      setErrors({});

      if (response.user.role === "manager") {
        navigate("/dashboard");
      } else {
        navigate("/employee/dashboard");
      }
    } catch (error) {
      setApiError(error.response?.data?.message || "Login failed.");
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <h2>Welcome Back</h2>

        <p className="auth-subtitle">
          Sign in to continue to Company Task Management System.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email</label>

            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => {
                handleChange(e);
                clearFieldError(e.target.name);
              }}
              className={errors.email ? "input-error" : ""}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="input-group">
            <label>Password</label>

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => {
                  handleChange(e);
                  clearFieldError(e.target.name);
                }}
                className={errors.password ? "input-error" : ""}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            {errors.password && (
              <span className="error-text">{errors.password}</span>
            )}
          </div>

          {apiError && <p className="api-error">{apiError}</p>}

          <button className="auth-btn" type="submit">
            Login
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}

export default Login;
