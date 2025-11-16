import { Link } from "react-router-dom";
import { SmartAccountButton } from "./SmartAccountButton";
import { ChainSwitcher } from "./ChainSwitcher";

interface HeaderProps {
  children?: React.ReactNode;
}

export const Header = ({ children }: HeaderProps = {}) => {
  return (
    <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container max-w-6xl mx-auto px-3 py-2 sm:px-4 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <Link to="/" className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
            <div>
              <h1 className="text-xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent leading-tight">
                ArcWise
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0 sm:mt-0.5">
                Split expenses, settle instantly
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <ChainSwitcher />
            <SmartAccountButton />
            {children}
          </div>
        </div>
      </div>
    </header>
  );
};
