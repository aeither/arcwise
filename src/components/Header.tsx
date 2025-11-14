import { BridgeButton } from "@/components/BridgeButton";
import { WalletButton } from "@/components/WalletButton";

interface HeaderProps {
  children?: React.ReactNode;
}

export const Header = ({ children }: HeaderProps) => {
  return (
    <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              ArcWise
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Split expenses with friends, settle with crypto
            </p>
          </div>
          <div className="flex items-center gap-3">
            <BridgeButton />
            <WalletButton />
            {children}
          </div>
        </div>
      </div>
    </header>
  );
};
