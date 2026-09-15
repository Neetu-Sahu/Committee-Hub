import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

const ROLES = [
  { id: "student", label: "🎓 Student / Fresher", shortLabel: "Student" },
  { id: "member", label: "👥 Committee Member", shortLabel: "Member" },
  { id: "coordinator", label: "⚡ Committee Coordinator", shortLabel: "Coordinator" },
  { id: "chairperson", label: "👑 Committee Chairperson", shortLabel: "Chairperson" },
  { id: "admin", label: "🛡️ System Administrator", shortLabel: "Admin" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const currentRole = ROLES.find((r) => r.id === role);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password, role);
      if (user.role === "fresher" && !user.onboardingComplete) {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      badgeText="Academic Session 2026–2027 Active"
      quote="“Empowering campus leadership, collaborative initiatives, and student governance.”"
      footerLeft="SRMSCET Portal"
      footerRight="Secure System"
    >
      <div className="auth-card">
        <h2 className="auth-title">Log in to CommitteeHub</h2>
        <p className="auth-subtitle">Select your account role to access your portal space.</p>

        {error && <div className="auth-error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-inner-form">
          <div className="form-group">
            <label className="form-label">Select Your Login Role</label>
            <div className="select-wrapper">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="form-control form-select"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your college email"
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="form-control"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? "Signing in..." : `Log in as ${currentRole?.shortLabel || "User"}`}
          </button>

          <div className="auth-note-box">
            <span className="auth-note-icon">💡</span>
            <div className="auth-note-text">
              <strong>Note:</strong> During demo, all 5 roles are open for selection. In production, Chairperson & Admin roles are restricted via email invitation by the System Admin.
            </div>
          </div>

          <div className="auth-footer-link">
            New here? <Link to="/register">Create an account</Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
