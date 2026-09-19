import { Toaster } from "@/components/ui/sonner";
import { useLocation } from "wouter";
import AdminApp from "@/pages/Admin";
import Home from "@/pages/Home";

export default function App() {
  const [location] = useLocation();
  return (
    <>
      {location.startsWith("/admin") ? <AdminApp /> : <Home />}
      <Toaster position="bottom-right" theme="dark" />
    </>
  );
}
