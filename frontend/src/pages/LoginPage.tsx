import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Users, Building2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const portalConfig = {
  provider: {
    title: "Provider Portal",
    icon: Shield,
    gradient: "portal-gradient-provider",
    variant: "provider" as const,
    path: "/provider",
    description:
      "Sign in to submit your monthly availability, view your schedule, and access points of contact, forms, and documents.",
  },
  client: {
    title: "Client Portal",
    icon: Users,
    gradient: "portal-gradient-client",
    variant: "clientPortal" as const,
    path: "/client",
    description:
      "Welcome back. Sign in to access your dashboard and manage your healthcare staffing needs.",
  },
  corporate: {
    title: "Corporate Portal",
    icon: Building2,
    gradient: "portal-gradient-corporate",
    variant: "corporate" as const,
    path: "/corporate",
    description:
      "Welcome back. Sign in to access your dashboard and manage your healthcare staffing needs.",
  },
};

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const portalType = (searchParams.get("portal") || "provider") as keyof typeof portalConfig;
  const config = portalConfig[portalType] || portalConfig.provider;
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("activated") === "1") {
      toast({
        title: "Account activated",
        description: "Sign in with the email and password you just set.",
      });
    }
  }, [searchParams, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    toast({ title: "Welcome back!", description: "Signed in successfully." });
    navigate(config.path);
    setIsLoading(false);
  };

  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className={`hidden lg:flex lg:w-1/2 ${config.gradient} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to portals</span>
          </button>

          <div>
            <div className="w-20 h-20 rounded-2xl bg-primary-foreground/20 backdrop-blur flex items-center justify-center mb-8">
              <Icon className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-bold mb-4">{config.title}</h1>
            <p className="text-lg text-primary-foreground/80 max-w-md">
              {config.description}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">F</span>
            </div>
            <span className="text-sm text-primary-foreground/70">Frontera Search Partners</span>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to portals</span>
            </button>
            <div className={`w-12 h-12 rounded-xl ${config.gradient} flex items-center justify-center mb-4`}>
              <Icon className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{config.title}</h1>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-foreground">Sign in</h2>
            <p className="text-muted-foreground mt-1">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@fronterasearch.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant={config.variant}
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Need access? Contact your Frontera representative.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
