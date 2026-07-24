import "./AdvancedSearchBar.css";

function AdvancedSearchBar({
  searchValue,
  onSearchChange,
  placeholder = "Search...",
  filters = [],
  children,
}) {
  return (
    <div className="advanced-search-bar">
      <div className="advanced-search-left">
        <input
          type="text"
          className="advanced-search-input"
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />

        {filters.map((filter) => (
          <select
            key={filter.key}
            className="advanced-search-select"
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
          >
            {filter.placeholder && (
              <option value="">
                {filter.placeholder}
              </option>
            )}

            {filter.options.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        ))}
      </div>

      <div className="advanced-search-right">
        {children}
      </div>
    </div>
  );
}

export default AdvancedSearchBar;