import { Navigate, Route, Routes } from "react-router-dom";
import ItemsPage from "./pages/ItemsPage";
import ItemDetailPage from "./pages/ItemDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ItemsPage />} />
      <Route path="/items/:key" element={<ItemDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
