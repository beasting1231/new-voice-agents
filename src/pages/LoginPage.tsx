import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell, Card, GoogleSignInButton } from "../components";
import { useAuth } from "../auth";

export function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [loading, navigate, user]);

  return (
    <AppShell>
      <Card>
        <div className="ui-login-logo">
          <img src="/BSLogoBlack.svg" alt="BS Voice Agents" />
        </div>
        <GoogleSignInButton
          onClick={async () => {
            setError(null);
            try {
              await signInWithGoogle();
              navigate("/dashboard");
            } catch {
              setError("Google sign-in failed. Make sure Google provider is enabled in Firebase Auth.");
            }
          }}
          disabled={loading}
          text="Continue with Google"
        />
        {error && <p className="ui-login-error">{error}</p>}
      </Card>
    </AppShell>
  );
}
