import { useState } from "react";
import { Modal } from "./Modal";
import { useAuth } from "../hooks/useAuth";

export default function AuthModal({ onClose }) {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // <-- New state
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Check if passwords match during sign up
    if (!isLogin && password !== confirmPassword) {
      return setError("Passwords do not match. Please try again.");
    }

    setLoading(true);

    const { error: authError } = isLogin 
      ? await login(email, password)
      : await signup(email, password);

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      onClose(); // Close the modal on success
    }
  };

  return (
    <Modal title={isLogin ? "Welcome back" : "Create an account"} onClose={onClose}>
      
      {/* Sleek Tabs for switching modes */}
      <div className="modetabs" style={{ padding: "0 0 1.2rem 0", borderBottom: "none" }}>
        <button 
          className={"modetab" + (isLogin ? " on" : "")} 
          onClick={() => { setIsLogin(true); setError(""); }}
          style={{ flex: 1, textAlign: "center" }}
        >
          Log In
        </button>
        <button 
          className={"modetab" + (!isLogin ? " on" : "")} 
          onClick={() => { setIsLogin(false); setError(""); }}
          style={{ flex: 1, textAlign: "center" }}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
        
        {/* Beautiful Error Display using your existing CSS system */}
        {error && (
          <div className="note" style={{ borderColor: "var(--danger)", backgroundColor: "rgba(214, 58, 74, 0.05)" }}>
            <span className="ntag" style={{ color: "var(--danger)" }}>Error</span>
            <span style={{ color: "var(--danger)", fontSize: ".78rem" }}>{error}</span>
          </div>
        )}
        
        <div className="field">
          <label>Email address</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="you@example.com"
            required 
             style={{ width: "100%" ,height: "2.4rem", padding: "0.4rem 0.6rem", borderRadius: "4px", border: "1px solid var(--muted-3)" }}
          />
        </div>
        
        <div className="field">
          <label>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="••••••••"
            required 
            minLength={6} 
             style={{ width: "100%" ,height: "2.4rem", padding: "0.4rem 0.6rem", borderRadius: "4px", border: "1px solid var(--muted-3)" }}
          />
        </div>

        {/* Conditional Confirm Password Field */}
        {!isLogin && (
          <div className="field">
            <label>Confirm Password</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              placeholder="••••••••"
              required 
              minLength={6} 
               style={{ width: "100%" ,height: "2.4rem", padding: "0.4rem 0.6rem", borderRadius: "4px", border: "1px solid var(--muted-3)" }}
            />
          </div>
        )}
        
        {/* Submit Button */}
        <button 
          className="btn-generate" 
          type="submit" 
          disabled={loading} 
          style={{ 
            marginTop: "0.5rem", 
            width: "100%", 
            justifyContent: "center", 
            padding: "0.6rem" 
          }}
        >
          {loading ? "Please wait..." : (isLogin ? "Log In securely" : "Create Account")}
        </button>
      </form>
    </Modal>
  );
}