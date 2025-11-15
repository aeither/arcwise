import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCircleSmartAccount } from "@/hooks/useCircleSmartAccount";
import { Check, ChevronDown, Network } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAccount } from "wagmi";

// Supported chains for Circle Smart Account
const SUPPORTED_CHAINS = [
  { id: 84532, name: "Base Sepolia", shortName: "Base" },
  { id: 421614, name: "Arbitrum Sepolia", shortName: "Arbitrum" },
  { id: 5042002, name: "Arc Testnet", shortName: "Arc" },
  { id: 11155111, name: "Ethereum Sepolia", shortName: "Sepolia" },
];

export function ChainSwitcher() {
  const { account } = useCircleSmartAccount();
  const { chainId: wagmiChainId } = useAccount();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get current chain from URL params, fallback to wagmi chainId, then default to Base Sepolia
  const chainFromUrl = searchParams.get('chain');
  const currentChainId = chainFromUrl ? parseInt(chainFromUrl) : (wagmiChainId || 84532);
  const currentChain = SUPPORTED_CHAINS.find((c) => c.id === currentChainId);

  const handleChainSwitch = (chainId: number) => {
    // Update URL params - pages will handle the actual chain switching via URL sync
    const newParams = new URLSearchParams(searchParams);
    newParams.set('chain', chainId.toString());
    navigate({ search: newParams.toString() }, { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="animate-fade-in gap-2">
          <Network className="h-4 w-4" />
          <span className="hidden sm:inline">
            {currentChain?.shortName || "Select Chain"}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Select Network</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_CHAINS.map((chain) => (
          <DropdownMenuItem
            key={chain.id}
            onClick={() => handleChainSwitch(chain.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span>{chain.name}</span>
            {currentChainId === chain.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        {!account && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 text-xs text-muted-foreground">
              Connect an account to switch chains
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
