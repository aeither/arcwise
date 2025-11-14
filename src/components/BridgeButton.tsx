import { Button } from "@/components/ui/button";
import { ArrowLeftRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function BridgeButton() {
  const navigate = useNavigate();

  const handleBridge = () => {
    navigate("/bridge");
  };

  return (
    <Button
      onClick={handleBridge}
      variant="outline"
      size="sm"
      className="animate-fade-in w-full sm:w-auto"
    >
      <ArrowLeftRight className="h-4 w-4 mr-1 sm:mr-2" />
      <span className="text-xs sm:text-sm">Bridge</span>
    </Button>
  );
}
