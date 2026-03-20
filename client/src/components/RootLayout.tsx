import { Outlet, NavLink } from "react-router";
import { Bookmark, Webhook } from "lucide-react";

export default function RootLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground">
            Job Search Engine
          </span>
          <nav className="flex items-center gap-1">
            <NavLink
              to="/search"
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              Search
            </NavLink>
            <NavLink
              to="/saved-searches"
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <Bookmark className="size-3.5" />
              Saved
            </NavLink>
            <NavLink
              to="/settings/webhooks"
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <Webhook className="size-3.5" />
              Webhooks
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
