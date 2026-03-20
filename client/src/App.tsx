import { Routes, Route, Navigate } from "react-router";
import RootLayout from "@/components/RootLayout";
import SearchPage from "@/pages/SearchPage";
import SavedSearchesPage from "@/pages/SavedSearchesPage";

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
      </Route>
    </Routes>
  );
}
