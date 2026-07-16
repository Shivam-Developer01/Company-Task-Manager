import "./SideDrawer.css";

import { FiX } from "react-icons/fi";

function SideDrawer({ isOpen, title, onClose, children }) {
  return (
    <>
      <div
        className={`drawer-overlay ${isOpen ? "show" : ""}`}
        onClick={onClose}
      />

      <aside className={`side-drawer ${isOpen ? "open" : ""}`}>
        <div className="drawer-header">
          <h2>{title}</h2>

          <button className="drawer-close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="drawer-content">{children}</div>
      </aside>
    </>
  );
}

export default SideDrawer;
