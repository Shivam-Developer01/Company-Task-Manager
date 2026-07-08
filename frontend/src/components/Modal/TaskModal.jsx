import { useState, useEffect } from "react";
import "./TaskModal.css";

function TaskModal({
  isOpen,
  onClose,
  isEdit = false,
  task = null,
  onSave,
  onUpdate,
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    status: "Pending",
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      dueDate: "",
      status: "Pending",
    });

    setErrors({});
    setApiError("");
  };

  const clearFieldError = (field) => {
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    clearFieldError(name);

    if (apiError) {
      setApiError("");
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setApiError("");

    if (isEdit && task) {
      setFormData({
        title: task.title,
        description: task.description,
        dueDate: task.dueDate?.slice(0, 10) || "",
        status: task.status,
      });

      setErrors({});
    } else {
      resetForm();
    }
  }, [isOpen, isEdit, task]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required.";
    } else if (formData.title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters.";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required.";
    } else if (formData.description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters.";
    }

    if (!formData.dueDate) {
      newErrors.dueDate = "Due date is required.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setApiError("");

      if (isEdit) {
        await onUpdate({
          ...task,
          ...formData,
        });
      } else {
        await onSave(formData);
      }

      resetForm();
      onClose();
    } catch (error) {
      setApiError(error.response?.data?.message || "Something went wrong.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{isEdit ? "Edit Task" : "Add New Task"}</h2>

          <button
            className="close-btn"
            onClick={() => {
              resetForm();
              onClose();
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>

            <input
              type="text"
              name="title"
              placeholder="Enter task title"
              value={formData.title}
              onChange={handleChange}
              className={errors.title ? "input-error" : ""}
            />

            {errors.title && <span className="error-text">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label>Description</label>

            <textarea
              name="description"
              rows="5"
              placeholder="Enter task description"
              value={formData.description}
              onChange={handleChange}
              className={errors.description ? "input-error" : ""}
            />

            {errors.description && (
              <span className="error-text">{errors.description}</span>
            )}
          </div>

          <div className="form-group">
            <label>Due Date</label>

            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              className={errors.dueDate ? "input-error" : ""}
            />

            {errors.dueDate && (
              <span className="error-text">{errors.dueDate}</span>
            )}
          </div>

          {isEdit && (
            <div className="form-group">
              <label>Status</label>

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          )}

          {apiError && <p className="api-error">{apiError}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Cancel
            </button>

            <button type="submit" className="save-btn">
              {isEdit ? "Update Task" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskModal;
