import "./TaskCard.css";

function TaskCard({ task, onEdit, onDelete }) {
  return (
    <div className="task-card">
      <div className="task-card-header">
        <span
          className={`status ${
            task.status === "Completed" ? "completed" : "pending"
          }`}
        >
          {task.status}
        </span>
      </div>

      <h3>{task.title}</h3>

      <p>{task.description}</p>

      <div className="task-footer">
        <div className="due-date">📅 {task.dueDate}</div>

        <div className="actions">
          <button className="edit-btn" onClick={() => onEdit(task)}>
            Edit
          </button>

          <button className="delete-btn" onClick={() => onDelete(task)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskCard;
