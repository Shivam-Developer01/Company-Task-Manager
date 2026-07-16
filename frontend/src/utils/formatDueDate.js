function formatDueDate(date) {
  const today = new Date();
  const due = new Date(date);

  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""}`,
      type: "overdue",
    };
  }

  if (diffDays === 0) {
    return {
      label: "Due Today",
      type: "today",
    };
  }

  if (diffDays === 1) {
    return {
      label: "Due Tomorrow",
      type: "tomorrow",
    };
  }

  if (diffDays <= 7) {
    return {
      label: `${diffDays} day${diffDays !== 1 ? "s" : ""} left`,
      type: "upcoming",
    };
  }

  return {
    label: due.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    type: "future",
  };
}

export default formatDueDate;