import { Button } from "@/components/ui/button";
import { Wallet, LogOut } from "lucide-react";
import { useCircleSmartAccount } from "@/hooks/useCircleSmartAccount";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SmartAccountButton() {
  const { account, username, logout } = useCircleSmartAccount();
  const navigate = useNavigate();

  if (!account) {
    return (
      <Button
        onClick={() => navigate("/circle-account")}
        variant="default"
        size="sm"
        className="animate-fade-in"
      >
        <Wallet className="h-4 w-4 mr-2" />
        <span>Connect</span>
      </Button>
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
