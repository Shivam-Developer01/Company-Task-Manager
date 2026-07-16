import "./StatusBadge.css";

function StatusBadge({ status }) {
  const value = String(status || "")
    .toLowerCase()
    .replace(/\s+/g, "_");

  return <span className={`status-badge ${value}`}>{status}</span>;
}

export default StatusBadge;
