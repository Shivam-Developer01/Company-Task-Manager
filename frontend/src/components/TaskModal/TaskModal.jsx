import { useEffect, useState } from "react";

import FormModal from "../FormModal/FormModal";
import "./TaskModal.css";

function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  task = null,
  employees = [],
  projects = [],
  loading = false,
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    project: "",
    priority: "Medium",
    dueDate: "",
    checklist: [],
    referenceAttachments: [],
  });

  useEffect(() => {
    if (!isOpen) return;

    if (task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        assignedTo: task.assignedTo?._id || "",
        project: task.project?._id || "",
        priority: task.priority || "Medium",
        dueDate: task.dueDate ? task.dueDate.substring(0, 10) : "",
        checklist: task.checklist || [],
        referenceAttachments: [],
      });
    } else {
      setFormData({
        title: "",
        description: "",
        assignedTo: "",
        project: "",
        priority: "Medium",
        dueDate: "",
        checklist: [],
        referenceAttachments: [],
      });
    }
  }, [task, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!isEditable) return;

    const data = new FormData();

    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("assignedTo", formData.assignedTo);

    if (formData.project) {
      data.append("project", formData.project);
    }

    data.append("priority", formData.priority);
    data.append("dueDate", formData.dueDate);

    data.append("checklist", JSON.stringify(formData.checklist));

    formData.referenceAttachments.forEach((file) => {
      data.append("referenceAttachments", file);
    });

    onSubmit(data);
  };

  const editableStatuses = [
    "Assigned",
    "Accepted",
    "In Progress",
    "Rejected",
    "Withdrawn",
  ];

  const isEditable = !task || editableStatuses.includes(task.status);

  return (
    <FormModal
      isOpen={isOpen}
      title={task ? "Edit Task" : "Create Task"}
      onClose={onClose}
      width="900px"
    >
      <form onSubmit={handleSubmit}>
        {!isEditable && (
          <div className="task-edit-warning">
            This task has been <b>{task.status}</b> and can no longer be edited.
          </div>
        )}
        
        {/* ===========================
              BASIC INFORMATION
        =========================== */}

        <div className="form-section">
          <h3>Basic Information</h3>

          <div className="form-group">
            <label>Task Title</label>

            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter task title"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>

            <textarea
              rows={4}
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the task..."
              required
            />
          </div>
        </div>

        {/* ===========================
                ASSIGNMENT
        =========================== */}

        <div className="form-section">
          <h3>Assignment</h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Employee</label>

              <select
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleChange}
                required
              >
                <option value="">Select Employee</option>

                {employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Project (Optional)</label>

              <select
                name="project"
                value={formData.project}
                onChange={handleChange}
              >
                <option value="">No Project</option>

                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ===========================
                TASK DETAILS
        =========================== */}

        <div className="form-section">
          <h3>Task Details</h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Priority</label>

              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option>Low</option>

                <option>Medium</option>

                <option>High</option>

                <option>Critical</option>
              </select>
            </div>

            <div className="form-group">
              <label>Due Date</label>

              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>
        {/* ===========================
                CHECKLIST
        =========================== */}

        <div className="form-section">
          <div className="section-header">
            <h3>Checklist</h3>

            <button
              type="button"
              className="add-item-btn"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  checklist: [
                    ...prev.checklist,
                    {
                      title: "",
                      completed: false,
                    },
                  ],
                }))
              }
            >
              + Add Item
            </button>
          </div>

          {formData.checklist.length === 0 ? (
            <p className="empty-checklist">No checklist items added.</p>
          ) : (
            formData.checklist.map((item, index) => (
              <div key={index} className="checklist-item">
                <input
                  type="text"
                  placeholder={`Checklist Item ${index + 1}`}
                  value={item.title}
                  onChange={(e) => {
                    const updated = [...formData.checklist];

                    updated[index].title = e.target.value;

                    setFormData((prev) => ({
                      ...prev,
                      checklist: updated,
                    }));
                  }}
                />

                <button
                  type="button"
                  className="remove-item-btn"
                  onClick={() => {
                    const updated = formData.checklist.filter(
                      (_, i) => i !== index,
                    );

                    setFormData((prev) => ({
                      ...prev,
                      checklist: updated,
                    }));
                  }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* ===========================
            REFERENCE ATTACHMENTS
        =========================== */}

        <div className="form-section">
          <h3>Reference Attachments</h3>

          <label className="upload-box">
            <input
              type="file"
              multiple
              hidden
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  referenceAttachments: [...e.target.files],
                }))
              }
            />

            <div className="upload-content">
              <div className="upload-icon">📎</div>

              <h4>Click to upload files</h4>

              <p>Upload reference documents, images or PDFs</p>
            </div>
          </label>

          {formData.referenceAttachments.length > 0 && (
            <div className="attachment-list">
              {formData.referenceAttachments.map((file, index) => (
                <div className="attachment-item">
                  <div className="attachment-info">
                    <span className="attachment-name">{file.name}</span>

                    <small>{(file.size / 1024).toFixed(1)} KB</small>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const files = formData.referenceAttachments.filter(
                        (_, i) => i !== index,
                      );

                      setFormData((prev) => ({
                        ...prev,
                        referenceAttachments: files,
                      }));
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===========================
                ACTIONS
        =========================== */}

        <div className="form-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>

          <button
            type="submit"
            className="save-btn"
            disabled={loading || !isEditable}
          >
            {loading ? "Please Wait..." : task ? "Update Task" : "Create Task"}
          </button>
        </div>
      </form>
    </FormModal>
  );
}

export default TaskModal;
