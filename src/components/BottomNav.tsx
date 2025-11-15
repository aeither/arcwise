import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeftRight, Wallet, ArrowUpDown, Zap } from "lucide-react";

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      path: "/bridge",
      icon: ArrowLeftRight,
      label: "Bridge",
    },
    {
      path: "/circle-account",
      icon: Wallet,
      label: "Account",
    },
    {
      path: "/gateway",
      icon: ArrowUpDown,
      label: "Gateway",
    },
    {
      path: "/gasless-bridge",
      icon: Zap,
      label: "Gasless",
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      {/* Glassmorphism bottom navigation */}
      <div className="relative mx-auto max-w-md px-4 pb-4">
        <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-2xl">
          {/* Gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent pointer-events-none" />

          {/* Navigation items */}
          <div className="relative grid grid-cols-4 gap-1 p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`
                    relative flex flex-col items-center justify-center gap-1 rounded-2xl p-3 transition-all duration-300
                    ${active
                      ? "bg-white/20 shadow-lg"
                      : "hover:bg-white/10 active:scale-95"
                    }
                  `}
                >
                  {/* Active indicator */}
                  {active && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 animate-pulse" />
                  )}

                  {/* Icon */}
                  <div className="relative">
                    <Icon
                      className={`h-5 w-5 transition-colors ${
                        active ? "text-primary" : "text-foreground/70"
                      }`}
                    />
                  </div>

                  {/* Label */}
                  <span className={`
                    relative text-[10px] font-medium transition-colors
                    ${active ? "text-foreground" : "text-foreground/60"}
                  `}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
