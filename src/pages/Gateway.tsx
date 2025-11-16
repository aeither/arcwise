import { useState, useEffect } from 'react'
import { useGateway } from '@/hooks/useGateway'
import { useCircleSmartAccount } from '@/hooks/useCircleSmartAccount'
import { SUPPORTED_CHAINS, type GatewayChainConfig } from '@/lib/gateway-constants'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useSearchParams } from 'react-router-dom'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ArrowUpDown, Wallet, RefreshCw, ArrowRightLeft, Info, Copy, CheckCircle } from 'lucide-react'

// Demo contacts - same as in CircleAccount.tsx and Index.tsx
const CONTACTS = [
  { name: 'Olivia', address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0' },
  { name: 'Juan', address: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0' },
  { name: 'Lucas', address: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199' },
]

const Gateway = () => {
  const [searchParams] = useSearchParams()
  
  // Get chain from URL for highlighting or pre-selection
  const chainFromUrl = searchParams.get('chain')
  const selectedChainId = chainFromUrl ? parseInt(chainFromUrl) : 84532 // Default to Base Sepolia
  
  const { account, credential, username, sendUSDC, isLoading: smartAccountLoading } = useCircleSmartAccount(selectedChainId)
  const address = account?.address
  const isConnected = !!account
  const {
    balances,
    totalBalance,
    isLoading,
    error,
    txHash,
    deposit,
    transfer,
    fetchBalances,
    clearTransaction,
  } = useGateway(address, credential ? { credential, username, address } : undefined)

  const { toast } = useToast()

  // Deposit dialog state
  const [depositDialogOpen, setDepositDialogOpen] = useState(false)
  const [selectedDepositChain, setSelectedDepositChain] = useState<GatewayChainConfig | null>(null)
  const [depositAmount, setDepositAmount] = useState('')

  // Transfer dialog state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [selectedTransferChain, setSelectedTransferChain] = useState<GatewayChainConfig | null>(null)
  const [transferAmount, setTransferAmount] = useState('')
  const [selectedContact, setSelectedContact] = useState<string>('')
  const [recipientAddress, setRecipientAddress] = useState('')

  const handleDeposit = async () => {
    if (!selectedDepositChain || !depositAmount) {
      toast({
        title: 'Invalid input',
        description: 'Please select a chain and enter an amount',
        variant: 'destructive',
      })
      return
    }

    try {
      await deposit(selectedDepositChain, depositAmount)
      toast({
        title: 'Deposit successful!',
        description: `Deposited ${depositAmount} USDC to ${selectedDepositChain.name}`,
      })
      setDepositDialogOpen(false)
      setDepositAmount('')
    } catch (err) {
      toast({
        title: 'Deposit failed',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      })
    }
  }

  const handleTransfer = async () => {
    if (!credential || !account) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to send money',
        variant: 'destructive',
      })
      return
    }

    if (!transferAmount || !recipientAddress) {
      toast({
        title: 'Invalid input',
        description: 'Please enter recipient and amount',
        variant: 'destructive',
      })
      return
    }

    if (!recipientAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({
        title: 'Invalid address',
        description: 'Please enter a valid Ethereum address',
        variant: 'destructive',
      })
      return
    }

    try {
      toast({
        title: 'Sending payment...',
        description: 'Processing - no fees!',
      })

      await sendUSDC(recipientAddress as `0x${string}`, transferAmount)
      
      toast({
        title: 'Transfer successful! 🎉',
        description: `Sent ${transferAmount} USDC`,
      })
      
      setTransferDialogOpen(false)
      setTransferAmount('')
      setSelectedContact('')
      setRecipientAddress('')
      
      // Refresh balances after transfer
      setTimeout(() => fetchBalances(), 2000)
    } catch (err) {
      toast({
        title: 'Transfer failed',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      })
    }
  }

  const handleContactSelect = (contactName: string) => {
    setSelectedContact(contactName)
    if (contactName === 'custom') {
      setRecipientAddress('')
    } else {
      const contact = CONTACTS.find(c => c.name === contactName)
      if (contact) {
        setRecipientAddress(contact.address)
      }
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container max-w-6xl mx-auto px-4 py-4">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Not Connected */}
        {!isConnected && (
          <Card>
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                Please sign in to view your total balance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  View all your money in one place, across different networks.
                  <span className="block text-xs text-muted-foreground mt-1">
                    ✨ Powered by Circle Gateway
                  </span>
                </AlertDescription>
              </Alert>
              <Button onClick={() => window.location.href = '/account'} className="w-full">
                Go to Account
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Connected View */}
        {isConnected && (
          <div className="space-y-4">
            {/* Consolidated Balance Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Total Balance</CardTitle>
                    <CardDescription>
                      Your money across all networks
                      <span className="text-xs text-muted-foreground ml-1">(Circle Gateway)</span>
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchBalances}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-3">
                  {isLoading ? (
                    <span className="text-muted-foreground">Loading...</span>
                  ) : (
                    <span>${totalBalance}</span>
                  )}
                </div>

                <div className="flex gap-4">
                  <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex-1">
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Send Money
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Send Money</DialogTitle>
                        <DialogDescription>
                          Send instantly with no fees
                          <span className="text-xs text-muted-foreground ml-1">(powered by Circle Smart Account)</span>
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">

                        <div>
                          <Label htmlFor="contact">Select Contact</Label>
                          <Select value={selectedContact} onValueChange={handleContactSelect}>
                            <SelectTrigger id="contact">
                              <SelectValue placeholder="Choose a contact or enter custom address" />
                            </SelectTrigger>
                            <SelectContent>
                              {CONTACTS.map((contact) => (
                                <SelectItem key={contact.name} value={contact.name}>
                                  {contact.name} ({contact.address.slice(0, 6)}...{contact.address.slice(-4)})
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">Custom address</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="transfer-recipient">Recipient Address</Label>
                          <Input
                            id="transfer-recipient"
                            type="text"
                            placeholder="0x..."
                            value={recipientAddress}
                            onChange={(e) => {
                              setRecipientAddress(e.target.value)
                              if (selectedContact !== 'custom') {
                                setSelectedContact('custom')
                              }
                            }}
                            disabled={isLoading || (selectedContact !== '' && selectedContact !== 'custom')}
                          />
                        </div>

                        <div>
                          <Label htmlFor="transfer-amount">Amount</Label>
                          <Input
                            id="transfer-amount"
                            type="number"
                            step="0.000001"
                            min="0"
                            max={totalBalance}
                            placeholder="0.00"
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(e.target.value)}
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            Available: ${totalBalance}
                          </p>
                        </div>

                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            ⚡ Instant transfer (under 500ms) with minimal fees (0.005%)
                          </AlertDescription>
                        </Alert>

                        <Button onClick={handleTransfer} className="w-full" disabled={smartAccountLoading}>
                          {smartAccountLoading ? 'Sending...' : 'Send USDC'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Per-Chain Balances */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Balance by Network</CardTitle>
                <CardDescription className="text-xs">
                  View your balance on each network
                  <span className="text-muted-foreground ml-1">(W=Wallet, G=Gateway)</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {SUPPORTED_CHAINS.map((chainConfig) => {
                    const chainBalance = balances.find(b => b.domain === chainConfig.domain)
                    const walletBalance = chainBalance?.walletBalance || '0'
                    const gatewayBalance = chainBalance?.balance || '0'

                    return (
                      <div
                        key={chainConfig.name}
                        className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-semibold truncate">{chainConfig.name}</h3>
                            {!chainConfig.supportsGateway && (
                              <span className="text-[9px] bg-muted px-1 py-0.5 rounded whitespace-nowrap">
                                N/A
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Domain: {chainConfig.domain}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            {isLoading ? (
                              <p className="text-[10px] text-muted-foreground">Loading...</p>
                            ) : (
                              <div className="space-y-0.5">
                                <div className="flex items-baseline gap-1">
                                  <p className="text-[9px] text-muted-foreground">W:</p>
                                  <p className="text-xs font-medium">{parseFloat(walletBalance).toFixed(2)}</p>
                                </div>
                                <div className="flex items-baseline gap-1">
                                  <p className="text-[9px] text-muted-foreground">G:</p>
                                  <p className="text-xs font-medium text-primary">{parseFloat(gatewayBalance).toFixed(2)}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {chainConfig.supportsGateway && (
                            <Dialog
                              open={depositDialogOpen && selectedDepositChain?.name === chainConfig.name}
                              onOpenChange={(open) => {
                                setDepositDialogOpen(open)
                                if (open) {
                                  setSelectedDepositChain(chainConfig)
                                } else {
                                  setSelectedDepositChain(null)
                                  setDepositAmount('')
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                                  <Wallet className="h-3 w-3 sm:mr-1" />
                                  <span className="hidden sm:inline">Deposit</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Deposit to {chainConfig.name}</DialogTitle>
                                  <DialogDescription>
                                    Deposit USDC to your unified Gateway balance
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Available in Wallet</p>
                                    <p className="text-lg font-semibold">{parseFloat(walletBalance).toFixed(6)} USDC</p>
                                  </div>

                                  <div>
                                    <Label htmlFor="deposit-amount">Amount (USDC)</Label>
                                    <Input
                                      id="deposit-amount"
                                      type="number"
                                      step="0.000001"
                                      min="0"
                                      max={walletBalance}
                                      placeholder="0.00"
                                      value={depositAmount}
                                      onChange={(e) => setDepositAmount(e.target.value)}
                                    />
                                    {parseFloat(depositAmount) > parseFloat(walletBalance) && (
                                      <p className="text-xs text-destructive mt-1">Amount exceeds wallet balance</p>
                                    )}
                                  </div>

                                  <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription className="text-sm">
                                      <strong>Important:</strong> Balance will be available after chain finality
                                      (Ethereum: ~20 min, Avalanche: instant, Base: ~2 min)
                                    </AlertDescription>
                                  </Alert>

                                  <Button
                                    onClick={handleDeposit}
                                    className="w-full"
                                    disabled={isLoading || parseFloat(depositAmount) > parseFloat(walletBalance)}
                                  >
                                    {isLoading ? 'Depositing...' : 'Deposit'}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <Alert className="mt-3">
                  <Info className="h-3 w-3" />
                  <AlertDescription className="text-xs">
                    Get test USDC from{' '}
                    <a
                      href="https://faucet.circle.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline font-semibold"
                    >
                      Circle Faucet
                    </a>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Transaction Status */}
            {txHash && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Transaction Status</CardTitle>
                    <Button variant="ghost" size="sm" onClick={clearTransaction}>
                      Clear
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <Label className="text-xs font-semibold text-green-600">
                        Transaction Confirmed!
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[10px] bg-muted px-2 py-1.5 rounded font-mono break-all">
                        {txHash}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(txHash, 'Transaction Hash')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">How Circle Gateway Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <div>
                  <h4 className="font-semibold mb-0.5 text-xs">Unified USDC Balance</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Circle Gateway provides a single, unified USDC balance across all supported chains.
                    You can deposit on any chain and spend from your total balance.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-0.5 text-xs">Fast Cross-Chain Transfers</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Transfers complete in under 500ms once your balance is established. The Gateway
                    automatically routes funds from multiple source chains if needed.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-0.5 text-xs">Low Fees</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Pay only 0.005% transfer fee plus base gas costs. No complex bridging required.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default Gateway
