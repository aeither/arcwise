import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function GatewayButton() {
  const navigate = useNavigate();

  const handleGateway = () => {
    navigate("/gateway");
  };

  return (
    <Button
      onClick={handleGateway}
      variant="outline"
      size="sm"
      className="animate-fade-in w-full sm:w-auto"
    >
      <ArrowUpDown className="h-4 w-4 mr-1 sm:mr-2" />
      <span className="text-xs sm:text-sm">Gateway</span>
    </Button>
  );
}
