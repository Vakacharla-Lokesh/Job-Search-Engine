import { Routes, Route, Navigate } from "react-router";
import RootLayout from "@/components/RootLayout";
import SearchPage from "@/pages/SearchPage";

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
      </Route>
    </Routes>
  );
}
