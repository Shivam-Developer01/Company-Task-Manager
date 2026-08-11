import "./ProjectTasksCard.css";

function ProjectTasksCard({ tasks }) {
  return (
    <div className="chart-card project-tasks-card">
      <h3>📌 Project Tasks</h3>

      <div className="table-wrapper">
        <table className="project-tasks-table">
          <thead>
            <tr>
              <th>Task Name</th>
              <th>Assigned To</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <tr key={task._id}>
                  <td>{task.title}</td>
                  <td>{task.assignedTo?.name || "-"}</td>
                  <td>{task.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="empty-row">
                  No project tasks found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProjectTasksCard;
