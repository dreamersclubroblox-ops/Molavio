import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BottomDock } from "@/components/BottomDock";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Shield, LogIn, LogOut, Coins } from "lucide-react";
import { useTokenBalance } from "@/hooks/useTokens";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const { data: balance } = useTokenBalance(user?.id);

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between gap-2 px-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-base font-bold tracking-tight sm:text-lg">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">B</span>
            <span className="hidden xs:inline sm:inline">BouncyTOOLS</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            {user && balance != null && (
              <div className="hidden xs:flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium sm:text-sm">
                <Coins className="h-3.5 w-3.5" /> {balance.toLocaleString()}
              </div>
            )}
            {isAdmin && (
              <Button asChild variant="ghost" size="sm" className="px-2 sm:px-3">
                <Link to="/admin"><Shield className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Admin</span></Link>
              </Button>
            )}
            {user ? (
              <Button variant="ghost" size="sm" onClick={signOut} className="px-2 sm:px-3">
                <LogOut className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Uitloggen</span>
              </Button>
            ) : (
              <Button asChild variant="default" size="sm">
                <Link to="/auth"><LogIn className="h-4 w-4 sm:mr-1.5" /><span className="hidden xs:inline">Inloggen</span></Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container px-3 pb-32 pt-6 sm:px-6 sm:pb-40 sm:pt-8">{children}</main>

      <BottomDock />
    </div>
  );
}
