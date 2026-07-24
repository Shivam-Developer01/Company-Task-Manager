import "./SearchableMultiSelect.css";

import { useEffect, useMemo, useRef, useState } from "react";

function SearchableMultiSelect({
  label,
  placeholder = "Search...",
  options = [],
  value = [],
  onChange,
  getOptionLabel,
  getOptionValue,
  renderOption,
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;

    const keyword = search.toLowerCase();

    return options.filter((option) => {
      return (
        option.name?.toLowerCase().includes(keyword) ||
        option.employeeId?.toLowerCase().includes(keyword) ||
        option.department?.name?.toLowerCase().includes(keyword) ||
        option.designation?.name?.toLowerCase().includes(keyword)
      );
    });
  }, [options, search]);

  const isSelected = (option) =>
    value.some((item) => getOptionValue(item) === getOptionValue(option));

  const toggleOption = (option) => {
    if (isSelected(option)) {
      onChange(
        value.filter((item) => getOptionValue(item) !== getOptionValue(option)),
      );
    } else {
      onChange([...value, option]);
    }
  };

  const removeChip = (option) => {
    onChange(
      value.filter((item) => getOptionValue(item) !== getOptionValue(option)),
    );
  };

  return (
    <div className="searchable-select" ref={containerRef}>
      {label && <label className="searchable-select-label">{label}</label>}

      <input
        className="searchable-select-input"
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setIsOpen(true)}
      />

      {isOpen && (
        <div className="searchable-select-dropdown">
          {filteredOptions.length === 0 ? (
            <div className="searchable-select-empty">No employees found</div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={getOptionValue(option)}
                className="searchable-select-option"
                onClick={() => toggleOption(option)}
              >
                <input type="checkbox" checked={isSelected(option)} readOnly />

                <div className="searchable-select-option-content">
                  {renderOption ? renderOption(option) : getOptionLabel(option)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {value.length > 0 && (
        <div className="searchable-select-chips">
          {value.map((item) => (
            <div className="searchable-select-chip" key={getOptionValue(item)}>
              <span>{getOptionLabel(item)}</span>

              <button type="button" onClick={() => removeChip(item)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchableMultiSelect;
