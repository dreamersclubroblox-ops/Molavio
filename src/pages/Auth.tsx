import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Link } from "react-router-dom";

// Map "admin2013" username to its email so Milan kan inloggen met gebruikersnaam.
function resolveLogin(input: string) {
  const v = input.trim();
  if (v.includes("@")) return v;
  // Username → synthetic email used by auth
  return `${v.toLowerCase()}@bouncytools.local`;
}

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = resolveLogin(String(fd.get("email")));
    const { error } = await supabase.auth.signInWithPassword({
      email, password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welkom terug");
    navigate("/");
  }

  async function signUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = resolveLogin(String(fd.get("email")));
    const { error } = await supabase.auth.signUp({
      email,
      password: String(fd.get("password")),
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: String(fd.get("name") || "") },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account aangemaakt — je bent ingelogd");
    navigate("/");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-xl ring-1 ring-border">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">B</span>
          BouncyTOOLS
        </Link>
        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Inloggen</TabsTrigger>
            <TabsTrigger value="signup">Registreren</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={signIn} className="space-y-3 pt-4">
              <div>
                <Label htmlFor="si-email">Gebruikersnaam of email</Label>
                <Input id="si-email" name="email" required placeholder="admin2013 of jij@mail.com" />
              </div>
              <div><Label htmlFor="si-pw">Wachtwoord</Label><Input id="si-pw" name="password" type="password" required minLength={6} /></div>
              <Button className="w-full" type="submit" disabled={loading}>Inloggen</Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-3 pt-4">
              <div><Label htmlFor="su-name">Naam</Label><Input id="su-name" name="name" required /></div>
              <div>
                <Label htmlFor="su-email">Gebruikersnaam of email</Label>
                <Input id="su-email" name="email" required placeholder="kies een gebruikersnaam" />
              </div>
              <div><Label htmlFor="su-pw">Wachtwoord</Label><Input id="su-pw" name="password" type="password" required minLength={6} /></div>
              <Button className="w-full" type="submit" disabled={loading}>Account aanmaken</Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
