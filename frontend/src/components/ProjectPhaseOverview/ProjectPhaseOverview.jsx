import "./ProjectPhaseOverview.css";

function ProjectPhaseOverview({ phases }) {
  if (!phases || phases.length === 0) return null;

  return (
    <div className="chart-card project-phase-overview-card">
      <h3>📌 Project Phase Overview</h3>

      <div className="table-wrapper">
        <table className="project-phase-overview-table">
          <thead>
            <tr>
              <th>Phase Name</th>
              <th>Total Tasks</th>
              <th>Completed</th>
              <th>In Progress</th>
              <th>Overdue</th>
            </tr>
          </thead>

          <tbody>
            {phases.map((phase) => (
              <tr key={phase._id}>
                <td>{phase.name}</td>
                <td>{phase.totalTasks}</td>
                <td>{phase.completedTasks}</td>
                <td>{phase.inProgressTasks}</td>
                <td>{phase.overdueTasks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProjectPhaseOverview;
