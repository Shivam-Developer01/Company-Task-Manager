import "./SearchBar.css";

function SearchBar({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
}) {
  return (
    <div className="search-container">
      <div className="search-box">
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="filters">
        <button
          className={
            filterStatus === "All" ? "filter-btn active" : "filter-btn"
          }
          onClick={() => setFilterStatus("All")}
        >
          All
        </button>

        <button
          className={
            filterStatus === "Pending" ? "filter-btn active" : "filter-btn"
          }
          onClick={() => setFilterStatus("Pending")}
        >
          Pending
        </button>

        <button
          className={
            filterStatus === "Completed" ? "filter-btn active" : "filter-btn"
          }
          onClick={() => setFilterStatus("Completed")}
        >
          Completed
        </button>
      </div>
    </div>
  );
}

export default SearchBar;
