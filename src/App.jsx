import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import { LocaleProvider } from "./context/LocaleContext";
import { ThemeProvider } from "./context/ThemeContext";
import Dashboard from "./Dashboard";
import Login from "./pages/Login";

function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  return user ? <Dashboard /> : <Login />;
}

export default function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
