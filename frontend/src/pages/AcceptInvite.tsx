import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const AcceptInvite = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const email = params.get("email") || "";

  useEffect(() => {
    // Supabase recovery links contain access_token in hash; handled automatically.
  }, []);

  const submit = async () => {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password set! Redirecting...");
    setTimeout(() => navigate("/provider"), 1000);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="glass-card rounded-xl p-8 max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold">Set Up Your Account</h1>
        <p className="text-sm text-muted-foreground">
          Welcome to Frontera Search Partners! Please set a password to activate your provider account.
        </p>
        {email && <div className="text-xs text-muted-foreground">Email: {email}</div>}
        <div className="space-y-2">
          <Label>New Password</Label>
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" />
        </div>
        <Button className="w-full" onClick={submit} disabled={loading}>
          {loading ? "Saving..." : "Activate Account"}
        </Button>
      </div>
    </div>
  );
};

export default AcceptInvite;
