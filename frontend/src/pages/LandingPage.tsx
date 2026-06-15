import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Building2, ArrowRight } from "lucide-react";

const portals = [
  {
    id: "provider",
    title: "Provider Portal",
    description: "Access your availability calendar, timesheets, credentialing forms, and more.",
    icon: Shield,
    path: "/provider",
    gradient: "portal-gradient-provider",
    color: "text-provider",
  },
  // Client portal temporarily hidden — keep code so we can re-enable later.

  {
    id: "corporate",
    title: "Corporate Portal",
    description: "Vendor partners, credentialing checklists, forms, and internal resources.",
    icon: Building2,
    path: "/corporate",
    gradient: "portal-gradient-corporate",
    color: "text-corporate",
  },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [hoveredPortal, setHoveredPortal] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg portal-gradient-provider flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">F</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Frontera Search Partners</h1>
              <p className="text-xs text-muted-foreground">Healthcare Staffing Portal</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 max-w-2xl"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Welcome to Your Portal
          </h2>
          <p className="text-lg text-muted-foreground">
            Connecting people in healthcare who belong together. Select your portal to get started.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl w-full">
          {portals.map((portal, index) => (
            <motion.div
              key={portal.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              onMouseEnter={() => setHoveredPortal(portal.id)}
              onMouseLeave={() => setHoveredPortal(null)}
              onClick={() => navigate(`/login?portal=${portal.id}`)}
              className="group cursor-pointer"
            >
              <div className="glass-card rounded-xl p-8 h-full flex flex-col items-center text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className={`w-16 h-16 rounded-2xl ${portal.gradient} flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110`}>
                  <portal.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{portal.title}</h3>
                <p className="text-muted-foreground text-sm mb-6 flex-1">{portal.description}</p>
                <div className={`flex items-center gap-2 ${portal.color} font-semibold text-sm transition-all duration-300 ${hoveredPortal === portal.id ? "gap-3" : ""}`}>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-6">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Frontera Search Partners. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
