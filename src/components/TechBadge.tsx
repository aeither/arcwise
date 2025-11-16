import { useState } from 'react'
import { Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function TechBadge() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="fixed bottom-24 right-4 z-40 bg-primary/10 hover:bg-primary/20 backdrop-blur-sm"
        >
          <Info className="h-4 w-4 mr-2" />
          Tech Stack
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>🏆 Arc Technologies</DialogTitle>
          <DialogDescription>
            Built with cutting-edge Web3 infrastructure
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              ⚡ Circle Paymaster
            </h3>
            <p className="text-xs text-muted-foreground">
              Powers all gasless transactions throughout the app. Users can send money without paying any gas fees,
              making it feel like a traditional payment app.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              🌉 Circle BridgeKit
            </h3>
            <p className="text-xs text-muted-foreground">
              Enables cross-chain USDC transfers in the "Add Funds" page. Automatically finds the cheapest route
              and handles CCTP (Cross-Chain Transfer Protocol) bridging.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              🌐 Circle Gateway
            </h3>
            <p className="text-xs text-muted-foreground">
              Provides a unified balance view across multiple chains in the "Balance" page. Enables instant
              cross-chain transfers (under 500ms).
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              🔐 Circle Modular Wallets
            </h3>
            <p className="text-xs text-muted-foreground">
              Powers the passkey-based authentication. Smart accounts with biometric auth (Face ID/Touch ID)
              - no seed phrases needed.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              🚀 Arc Testnet
            </h3>
            <p className="text-xs text-muted-foreground">
              Primary destination chain for all bridging operations. The app is designed to onboard users
              onto Arc Testnet seamlessly.
            </p>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Design Philosophy:</strong> Hide the complexity, show the magic. Users experience instant,
              free payments without needing to understand blockchain concepts. The Web3 tech powers a Web2 UX.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
