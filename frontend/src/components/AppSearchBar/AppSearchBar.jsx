import "./AppSearchBar.css";

function AppSearchBar({
  searchValue,
  onSearchChange,

  placeholder = "Search...",

  filterValue = "",

  onFilterChange = () => {},

  filters = [],
}) {
  return (
    <div className="app-searchbar">
      <div className="search-input">
        <input
          type="text"
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {filters.length > 0 && (
        <div className="search-filters">
          {filters.map((filter) => (
            <button
              key={filter.value}
              className={
                filterValue === filter.value
                  ? "filter-btn active"
                  : "filter-btn"
              }
              onClick={() => onFilterChange(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default AppSearchBar;
