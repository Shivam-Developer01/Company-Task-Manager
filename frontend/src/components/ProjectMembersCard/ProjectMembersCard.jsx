import "./ProjectMembersCard.css";

function ProjectMembersCard({ members = [], onMemberClick }) {
  return (
    <div className="chart-card project-members-card">
      <h3>👥 Project Members</h3>

      <div className="table-wrapper">
        <table className="project-members-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Active Tasks</th>
            </tr>
          </thead>

          <tbody>
            {members.length > 0 ? (
              members.map((member) => (
                <tr
                  key={member._id || member.id}
                  className={onMemberClick ? "clickable-row" : ""}
                  onClick={() => onMemberClick && onMemberClick(member)}
                >
                  <td>{member.name}</td>
                  <td>{member.role}</td>
                  <td>{member.activeTasks ?? "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="empty-row">
                  No project members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProjectMembersCard;
