import { useEffect, useState } from "react";

import FormModal from "../FormModal/FormModal";

function SubmitTaskModal({ isOpen, loading, onClose, onSubmit }) {
  const [message, setMessage] = useState("");

  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setMessage("");
      setFiles([]);
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData();

    formData.append("message", message);

    files.forEach((file) => {
      formData.append("attachments", file);
    });

    onSubmit(formData);
  };

  return (
    <FormModal isOpen={isOpen} title="Submit Task" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Submission Message</label>

          <textarea
            rows={5}
            placeholder="Describe what you completed..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Attachments</label>

          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files))}
          />

          {files.length > 0 && (
            <ul className="selected-files">
              {files.map((file, index) => (
                <li key={index}>{file.name}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>

          <button type="submit" className="save-btn" disabled={loading}>
            {loading ? "Submitting..." : "Submit Task"}
          </button>
        </div>
      </form>
    </FormModal>
  );
}

export default SubmitTaskModal;
