import { Link } from "react-router-dom";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout/AuthLayout";
import "../../styles/Auth.css";
import useForm from "../../hooks/useForm";
import authService from "../../services/authService";

function Login() {
  const navigate = useNavigate();

  const { formData, handleChange, resetForm } = useForm({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");

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

    if (!validateForm()) return;

    try {
      const response = await authService.login(formData);

      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));

      resetForm();
      setErrors({});

      navigate("/dashboard");
    } catch (error) {
      setApiError(error.response?.data?.message || "Login failed.");
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <h2>Welcome Back</h2>

        <p className="auth-subtitle">
          Sign in to continue managing your tasks.
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

            <input
              type="password"
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
            {errors.password && (
              <span className="error-text">{errors.password}</span>
            )}
          </div>

          {apiError && <p className="api-error">{apiError}</p>}

          <button className="auth-btn" type="submit">
            Login
          </button>
        </form>

        <p className="redirect-text">
          Don't have an account?
          <Link to="/register">Register</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default Login;
