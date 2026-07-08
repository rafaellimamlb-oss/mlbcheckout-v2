import { useAuth } from "@/hooks/useAuth";
import Login from "@/pages/Login";
import Index from "@/pages/Index";

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground text-sm">
        Carregando...
      </div>
    );
  }

  return session ? <Index /> : <Login />;
}
