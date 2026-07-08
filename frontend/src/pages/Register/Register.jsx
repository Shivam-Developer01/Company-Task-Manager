import { Link } from "react-router-dom";
import { useState } from "react";
import AuthLayout from "../../layouts/AuthLayout/AuthLayout";
import "../../styles/auth.css";
import useForm from "../../hooks/useForm";
import authService from "../../services/authService";

function Register() {
  const { formData, handleChange, resetForm } = useForm({
    name: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required.";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters.";
    }

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
      setApiError("");

      await authService.register(formData);

      resetForm();
    } catch (error) {
      setApiError(error.response?.data?.message || "Registration failed.");
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <h2>Create Account</h2>

        <p className="auth-subtitle">
          Create your account to start managing your tasks.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Name</label>

            <input
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Enter your name"
              value={formData.name}
              onChange={(e) => {
                handleChange(e);
                clearFieldError(e.target.name);
              }}
              className={errors.name ? "input-error" : ""}
            />

            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

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
            Create Account
          </button>
        </form>

        <p className="redirect-text">
          Already have an account?
          <Link to="/">Login</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default Register;
