import "./EmptyState.css";

function EmptyState({ onCreate }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">📝</div>

      <h2>No Tasks Yet</h2>

      <p>
        Looks like you haven't created any tasks. Click below to create your
        first task.
      </p>

      <button className="create-btn" onClick={onCreate}>
        + Create Task
      </button>
    </div>
  );
}

export default EmptyState;
