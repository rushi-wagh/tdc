import { Eye, EyeOff, HeartHandshake, Loader2 } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const LoginPage = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/profiles" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password) {
      setError("Enter your email and password to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate("/profiles", { replace: true });
    } catch (apiError) {
      setError(apiError.message || "Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-8">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-[#eadbd1] bg-white shadow-soft lg:grid-cols-[0.95fr_1.05fr]">
        <div className="bg-burgundy px-8 py-10 text-white sm:px-10 lg:px-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-white/15 bg-white/10">
            <HeartHandshake className="h-8 w-8 text-gold" aria-hidden="true" />
          </div>
          <p className="mt-8 text-sm uppercase tracking-[0.2em] text-blush/80">The Date Crew</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight">Matchmaker Dashboard</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-blush/85">
            A focused workspace for assigned profiles, conversation notes, and recommendation review.
          </p>
          <div className="mt-10 border-t border-white/10 pt-6 text-sm text-blush/80">
            Use your matchmaker account. Sessions are stored with the backend&apos;s secure cookie.
          </div>
        </div>

        <div className="px-6 py-8 sm:px-10 lg:px-12">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-ink">Welcome back</h2>
            <p className="mt-2 text-sm text-muted">Sign in to continue matching with care.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                className="field"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="matchmaker1@demo.tdc"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  className="field pr-11"
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 rounded-md p-2 text-muted transition hover:bg-ivory hover:text-burgundy"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Sign in
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
