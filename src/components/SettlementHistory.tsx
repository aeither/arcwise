import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { arbitrumSepolia, arcTestnet, baseSepolia, sepolia, avalancheFuji } from "viem/chains";

export interface Settlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  txHash: string;
  timestamp: Date;
  chain: string;
  chainId?: number; // Optional for backwards compatibility
}

// Map chain names to chain IDs for backward compatibility
const getChainIdFromName = (chainName: string): number => {
  if (chainName.includes('Base Sepolia')) return baseSepolia.id;
  if (chainName.includes('Arc Testnet')) return arcTestnet.id;
  if (chainName.includes('Arbitrum Sepolia')) return arbitrumSepolia.id;
  if (chainName.includes('Avalanche Fuji')) return avalancheFuji.id;
  if (chainName.includes('Sepolia')) return sepolia.id;
  return baseSepolia.id; // Default fallback
};

// Get block explorer URL for a chain
const getExplorerUrl = (chainId: number, txHash: string): string => {
  let chain;
  switch (chainId) {
    case sepolia.id:
      chain = sepolia;
      break;
    case baseSepolia.id:
      chain = baseSepolia;
      break;
    case arbitrumSepolia.id:
      chain = arbitrumSepolia;
      break;
    case arcTestnet.id:
      chain = arcTestnet;
      break;
    case avalancheFuji.id:
      chain = avalancheFuji;
      break;
    default:
      chain = baseSepolia; // Fallback
  }

  const explorerUrl = chain.blockExplorers?.default?.url || 'https://etherscan.io';
  return `${explorerUrl}/tx/${txHash}`;
};

interface SettlementHistoryProps {
  settlements: Settlement[];
}

export function SettlementHistory({ settlements }: SettlementHistoryProps) {
  if (settlements.length === 0) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-xl">Settlement History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">No settlements yet</p>
            <p className="text-xs mt-1">Payments will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg lg:text-xl">Settlement History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-6 pt-0">
        {settlements.map((settlement, index) => (
          <div
            key={settlement.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3 bg-success/10 rounded-lg border border-success/20 animate-fade-in group gap-2 sm:gap-3"
            style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "backwards" }}
          >
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success shrink-0 mt-0.5 sm:mt-0" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="font-medium text-xs sm:text-sm truncate">
                    {settlement.from} → {settlement.to}
                  </span>
                  <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
                    {settlement.chain}
                  </Badge>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                  {settlement.timestamp.toLocaleDateString()}{" "}
                  <span className="hidden sm:inline">at {settlement.timestamp.toLocaleTimeString()}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
              <span className="text-sm sm:text-base font-bold text-success">
                ${settlement.amount.toFixed(2)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
                onClick={() => {
                  const chainId = settlement.chainId || getChainIdFromName(settlement.chain);
                  const explorerUrl = getExplorerUrl(chainId, settlement.txHash);
                  window.open(explorerUrl, '_blank');
                }}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
