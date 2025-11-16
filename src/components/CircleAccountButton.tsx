import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function CircleAccountButton() {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate("/account");
  };

  return (
    <Button
      onClick={handleNavigate}
      variant="outline"
      size="sm"
      className="animate-fade-in w-full sm:w-auto"
    >
      <Wallet className="h-4 w-4 mr-1 sm:mr-2" />
      <span className="text-xs sm:text-sm">Circle Account</span>
    </Button>
  );
}
