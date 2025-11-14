import { Button } from "@/components/ui/button";
import { ArrowLeftRight } from "lucide-react";
import { BridgeKit } from "@circle-fin/bridge-kit";
import { createAdapterFromWallet } from "@circle-fin/adapter-viem-v2";
import { useAccount, useWalletClient } from "wagmi";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

// Only support Base and Base Sepolia
const SUPPORTED_CHAINS = ["Base", "Base Sepolia"] as const;

export function BridgeButton() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleBridge = async () => {
    if (!isConnected || !address || !walletClient) {
      toast({
        title: "Connect wallet first",
        description: "Please connect your wallet to use Bridge",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      const kit = new BridgeKit({
        chains: SUPPORTED_CHAINS,
      });

      const adapter = createAdapterFromWallet({
        walletClient,
      });

      const result = await kit.bridge({
        from: { adapter, chain: "Base Sepolia" },
        to: { adapter, chain: "Base" },
        amount: "0.01",
      });

      toast({
        title: "Bridge successful",
        description: `Transaction: ${result.txHash}`,
      });
    } catch (error) {
      toast({
        title: "Bridge failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleBridge}
      variant="outline"
      size="sm"
      className="animate-fade-in w-full sm:w-auto"
      disabled={!isConnected || isLoading}
    >
      <ArrowLeftRight className="h-4 w-4 mr-1 sm:mr-2" />
      <span className="text-xs sm:text-sm">
        {isLoading ? "Bridging..." : "Bridge"}
      </span>
    </Button>
  );
}
