import { HeartHandshake, LogOut, UsersRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-cream text-ink lg:flex">
      <aside className="bg-burgundy text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:flex-col">
        <div className="flex items-center justify-between gap-4 px-5 py-5 lg:block lg:px-6 lg:py-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-white/10">
              <HeartHandshake className="h-6 w-6 text-gold" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-blush/80">The Date Crew</p>
              <h1 className="text-lg font-semibold leading-tight">Matchmaker</h1>
            </div>
          </div>
        </div>

        <nav className="flex gap-2 px-5 pb-5 lg:block lg:flex-1 lg:px-4">
          <NavLink
            to="/profiles"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                isActive ? "bg-blush text-burgundy" : "text-white/78 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <UsersRound className="h-4 w-4" aria-hidden="true" />
            My Profiles
          </NavLink>
        </nav>

        <div className="border-t border-white/10 px-5 py-5 lg:px-6">
          <p className="text-xs text-blush/75">Signed in as</p>
          <p className="mt-1 truncate text-sm font-semibold">{user?.name || user?.email}</p>
          <button type="button" className="mt-4 w-full btn-secondary border-white/15 bg-white/10 text-white hover:bg-white hover:text-burgundy" onClick={logout}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
};

export default AppLayout;
