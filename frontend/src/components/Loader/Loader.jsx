import "./Loader.css";

function Loader() {
  return (
    <div className="loader-grid">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div className="skeleton-card" key={item}>
          <div className="skeleton badge"></div>

          <div className="skeleton title"></div>

          <div className="skeleton text"></div>
          <div className="skeleton text short"></div>

          <div className="bottom">
            <div className="skeleton date"></div>

            <div className="buttons">
              <div className="skeleton btn"></div>
              <div className="skeleton btn"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Loader;
