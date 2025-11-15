import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function GaslessBridgeButton() {
  const navigate = useNavigate();

  const handleGaslessBridge = () => {
    navigate("/gasless-bridge");
  };

  return (
    <Button
      onClick={handleGaslessBridge}
      variant="outline"
      size="sm"
      className="animate-fade-in w-full sm:w-auto"
    >
      <Zap className="h-4 w-4 mr-1 sm:mr-2" />
      <span className="text-xs sm:text-sm">Gasless Bridge</span>
    </Button>
  );
}
