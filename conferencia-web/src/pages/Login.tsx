import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScanBarcode } from "lucide-react";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    setLoading(false);
    if (signInError) setError("E-mail ou senha inválidos.");
  };

  return (
    <div className="flex items-center justify-center h-screen bg-background px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-card border border-border rounded-md p-6 shadow-md"
      >
        <div className="flex items-center gap-2 mb-6 justify-center">
          <ScanBarcode className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg tracking-wide">CONFERÊNCIA</span>
        </div>

        <label className="text-xs font-bold text-muted-foreground tracking-widest block mb-1">
          E-MAIL
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          className="w-full mb-4 border-2 border-input rounded px-3 py-2 bg-background text-foreground focus:outline-none focus:border-primary"
        />

        <label className="text-xs font-bold text-muted-foreground tracking-widest block mb-1">
          SENHA
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full mb-4 border-2 border-input rounded px-3 py-2 bg-background text-foreground focus:outline-none focus:border-primary"
        />

        {error && <p className="text-sm text-destructive font-semibold mb-3">{error}</p>}

        <Button type="submit" className="w-full h-11 font-bold" disabled={loading}>
          {loading ? "ENTRANDO..." : "ENTRAR"}
        </Button>
      </form>
    </div>
  );
}
