import "./DataTable.css";

function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = "No records found.",
  sortField,
  sortOrder,
  onSort,
  onRowClick,
  headerColor = "#2563eb",
}) {
  const tableStyle = {
    "--header-bg": headerColor,
  };

  const handleRowClickEvent = (row, e) => {
    if (!onRowClick) return;
    const interactiveTarget = e.target.closest(
      "button, a, input, select, textarea, label, [role='button'], .table-actions, .icon-action, .no-row-click"
    );
    if (interactiveTarget) {
      return;
    }
    onRowClick(row, e);
  };

  if (loading) {
    return (
      <div className="table-card">
        <div className="table-scroll-container">
          <table className="data-table" style={tableStyle}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    onClick={() =>
                      column.sortable && onSort && onSort(column.key)
                    }
                    className={column.sortable ? "sortable" : ""}
                  >
                    <div className="th-content">
                      <span>{column.label}</span>
                      {column.sortable && (
                        <span className={`sort-arrow ${sortField === column.key ? "active" : ""}`}>
                          {sortField === column.key ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {[...Array(6)].map((_, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      <div className="skeleton-cell" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="table-card">
      <div className="table-scroll-container">
        <table className="data-table" style={tableStyle}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() =>
                    column.sortable && onSort && onSort(column.key)
                  }
                  className={column.sortable ? "sortable" : ""}
                >
                  <div className="th-content">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span className={`sort-arrow ${sortField === column.key ? "active" : ""}`}>
                        {sortField === column.key ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="empty-cell">
                  <div className="empty-state">
                    <div className="empty-icon">📂</div>
                    <h3>No Records Found</h3>
                    <p>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={row._id || row.id || rowIndex}
                  tabIndex={onRowClick ? 0 : undefined}
                  className={onRowClick ? "clickable-row" : ""}
                  onClick={(e) => handleRowClickEvent(row, e)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleRowClickEvent(row, e);
                    }
                  }}
                >
                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
