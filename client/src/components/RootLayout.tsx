import { Outlet } from "react-router";

export default function RootLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b px-6 py-4">
        <span className="font-semibold text-foreground">Job Search Engine</span>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
