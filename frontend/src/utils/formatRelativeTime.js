function formatRelativeTime(date) {
  const now = new Date();
  const target = new Date(date);

  const seconds = Math.floor((now - target) / 1000);

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }

  const days = Math.floor(hours / 24);

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return `${days} days ago`;
  }

  const weeks = Math.floor(days / 7);

  if (weeks < 5) {
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }

  if (days < 30) {
    return target.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  }

  if (target.getFullYear() === now.getFullYear()) {
    return target.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  }

  return target.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default formatRelativeTime;
