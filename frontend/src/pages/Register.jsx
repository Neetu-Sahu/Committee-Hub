import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import AuthLayout from "../components/AuthLayout";

const ROLES = [
  { id: "student", label: "🎓 Student / Fresher", shortLabel: "Student" },
  { id: "member", label: "👥 Committee Member", shortLabel: "Member" },
  { id: "coordinator", label: "⚡ Committee Coordinator", shortLabel: "Coordinator" },
  { id: "chairperson", label: "👑 Committee Chairperson", shortLabel: "Chairperson" },
  { id: "admin", label: "🛡️ System Administrator", shortLabel: "Admin" },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("coordinator");
  const [committees, setCommittees] = useState([]);
  const [committeeId, setCommitteeId] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    enrollmentNo: "",
    branch: "",
    year: 1,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const currentRole = ROLES.find((r) => r.id === role);

  useEffect(() => {
    if (["chairperson", "coordinator", "member"].includes(role)) {
      api.get("/committees").then((res) => {
        setCommittees(res.data);
        if (res.data.length > 0 && !committeeId) {
          setCommitteeId(res.data[0]._id);
        }
      });
    }
  }, [role]);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await register({
        ...form,
        role,
        committeeId: ["chairperson", "coordinator", "member"].includes(role) ? committeeId : undefined,
      });

      if (user.role === "student" || user.role === "fresher") {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      badgeText="Spring Academic Session 2025"
      quote="“Unite leaders, organize chapters, and elevate campus student life.”"
      footerLeft="SRMSCET Autonomous Network"
      footerRight="Systems Online"
    >
      <div className="auth-card">
        <h2 className="auth-title">Create your account</h2>
        <p className="auth-subtitle">Select your role to register on CommitteeHub.</p>

        {error && <div className="auth-error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-inner-form">
          <div className="form-group">
            <label className="form-label">Account Role</label>
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

          {["chairperson", "coordinator", "member"].includes(role) && (
            <div className="form-group">
              <label className="form-label">Select Your Associated Committee</label>
              <div className="select-wrapper">
                <select
                  value={committeeId}
                  onChange={(e) => setCommitteeId(e.target.value)}
                  required
                  className="form-control form-select"
                >
                  {committees.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              value={form.name}
              onChange={update("name")}
              required
              placeholder="Enter your full name"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="form-label">College Email</label>
            <input
              type="email"
              value={form.email}
              onChange={update("email")}
              required
              placeholder="Enter your college email"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={update("password")}
                required
                minLength={6}
                placeholder="Create a password (min. 6 characters)"
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

          <div className="form-group">
            <label className="form-label">Enrollment / Student ID No.</label>
            <input
              value={form.enrollmentNo}
              onChange={update("enrollmentNo")}
              placeholder="Enter enrollment / student ID no."
              className="form-control"
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Branch</label>
              <input
                value={form.branch}
                onChange={update("branch")}
                placeholder="Enter branch (e.g. CSE)"
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <div className="select-wrapper">
                <select
                  value={form.year}
                  onChange={update("year")}
                  className="form-control form-select"
                >
                  <option value={1}>1st Year</option>
                  <option value={2}>2nd Year</option>
                  <option value={3}>3rd Year</option>
                  <option value={4}>4th Year</option>
                </select>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? "Creating account..." : `Register as ${currentRole?.shortLabel || "User"}`}
          </button>

          <div className="auth-note-box">
            <span className="auth-note-icon">💡</span>
            <div className="auth-note-text">
              <strong>Note:</strong> All 5 roles are open for testing. In production, institutional email verification is required.
            </div>
          </div>

          <div className="auth-footer-link">
            Already registered? <Link to="/login">Log in to your account</Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
