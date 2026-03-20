import { Routes, Route, Navigate } from "react-router";
import RootLayout from "@/components/RootLayout";
import SearchPage from "@/pages/SearchPage";
import SavedSearchesPage from "@/pages/SavedSearchesPage";
import WebhookSettingsPage from "@/pages/WebhookSettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route
          index
          element={
            <Navigate
              to="/search"
              replace
            />
          }
        />
        <Route
          path="/search"
          element={<SearchPage />}
        />
        <Route
          path="/saved-searches"
          element={<SavedSearchesPage />}
        />
        <Route
          path="/settings/webhooks"
          element={<WebhookSettingsPage />}
        />
      </Route>
    </Routes>
  );
}
