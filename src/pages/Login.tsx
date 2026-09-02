import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../components/AuthModal";

export default function Login() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Sign in — NoticeDesk";
  }, []);

  if (loading) return null;
  if (session) return <Navigate to="/app" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <AuthModal open={true} onClose={() => navigate("/")} />
    </div>
  );
}
