import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, Copy } from "lucide-react";
import { useCircleSmartAccount } from "@/hooks/useCircleSmartAccount";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SmartAccountButton() {
  const { account, username, login, logout } = useCircleSmartAccount();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleLogin = async () => {
    try {
      setIsConnecting(true);
      await login();
      toast({
        title: "Signed in!",
        description: "Welcome back",
      });
      setConnectDialogOpen(false);
      // Redirect to home page after successful login
      setTimeout(() => navigate("/"), 100);
    } catch (err) {
      toast({
        title: "Connection failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCopyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account.address);
      toast({
        title: "Address copied!",
        description: "Your account address has been copied to clipboard",
      });
    }
  };

  if (!account) {
    return (
      <>
        <Button
          onClick={() => setConnectDialogOpen(true)}
          variant="default"
          size="sm"
          className="animate-fade-in"
        >
          <Wallet className="h-4 w-4 mr-2" />
          <span>Connect</span>
        </Button>

        <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sign In</DialogTitle>
              <DialogDescription>
                Sign in with Face ID or create a new account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Button
                onClick={handleLogin}
                className="w-full"
                disabled={isConnecting}
              >
                {isConnecting ? "Signing in..." : "Sign In"}
              </Button>
              <Button
                onClick={() => {
                  setConnectDialogOpen(false);
                  navigate("/account");
                }}
                variant="outline"
                className="w-full"
              >
                Create Account
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="animate-fade-in">
          <Wallet className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">
            {username || `${account.address.slice(0, 6)}...${account.address.slice(-4)}`}
          </span>
          <span className="sm:hidden">
            {account.address.slice(0, 4)}...
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/account")}>
          <Wallet className="h-4 w-4 mr-2" />
          View Account
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyAddress}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
