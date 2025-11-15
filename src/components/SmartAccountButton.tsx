import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut } from "lucide-react";
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
        title: "Connected!",
        description: "Successfully logged in with your Smart Account",
      });
      setConnectDialogOpen(false);
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
              <DialogTitle>Connect Smart Account</DialogTitle>
              <DialogDescription>
                Login with your passkey or create a new account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Button
                onClick={handleLogin}
                className="w-full"
                disabled={isConnecting}
              >
                {isConnecting ? "Connecting..." : "Login with Passkey"}
              </Button>
              <Button
                onClick={() => {
                  setConnectDialogOpen(false);
                  navigate("/circle-account");
                }}
                variant="outline"
                className="w-full"
              >
                Register New Account
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
        <DropdownMenuLabel>Smart Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/circle-account")}>
          <Wallet className="h-4 w-4 mr-2" />
          View Account
        </DropdownMenuItem>
        <DropdownMenuItem onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
