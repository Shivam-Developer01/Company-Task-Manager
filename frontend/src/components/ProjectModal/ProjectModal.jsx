import "../FormModal/FormModal.css";

import FormModal from "../FormModal/FormModal";

import { useEffect, useState } from "react";

function ProjectModal({
  isOpen,
  onClose,
  onSubmit,
  project = null,
  loading = false,
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (!isOpen) return;

    if (project) {
      setFormData({
        name: project.name || "",
        description: project.description || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
      });
    }
  }, [project, isOpen]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <FormModal
      isOpen={isOpen}
      title={project ? "Edit Project" : "Create Project"}
      onClose={onClose}
      width="650px"
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Project Name</label>

          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Description</label>

          <textarea
            rows={5}
            name="description"
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>

          <button type="submit" className="save-btn" disabled={loading}>
            {loading ? "Please Wait..." : project ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </FormModal>
  );
}

export default ProjectModal;
