import { useEffect, useState } from "react";
import "./Loader.css";

function Loader({ delay = 250 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (!visible) {
    return null;
  }

  return (
    <div className="loader-container">
      <div className="loader-spinner" />
      <p>Loading...</p>
    </div>
  );
}

export default Loader;
