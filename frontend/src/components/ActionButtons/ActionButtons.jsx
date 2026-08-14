import "./ActionButtons.css";

function ActionButtons({ actions = [] }) {
  return (
    <div className="table-actions">
      {actions.map((action, index) => (
        <button
          key={index}
          type="button"
          title={action.title}
          className={`icon-action ${action.variant || ""}`}
          onClick={(e) => {
            e.stopPropagation();
            if (action.onClick) action.onClick(e);
          }}
          disabled={action.disabled}
        >
          {action.icon}
        </button>
      ))}
    </div>
  );
}

export default ActionButtons;
