import "./AuthLayout.css";

function AuthLayout({ children }) {
  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="brand">
          <div className="brand-logo">✓</div>

          <h1>RKI</h1>

          <p>Organize your work. Track your progress. Complete your goals.</p>
        </div>
      </div>

      <div className="auth-right">{children}</div>
    </div>
  );
}

export default AuthLayout;
