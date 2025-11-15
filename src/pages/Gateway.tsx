import { useState } from 'react'
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

const Gateway = () => {
  const { account } = useCircleSmartAccount()
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
  } = useGateway(address, account)

  const { toast } = useToast()

  // Deposit dialog state
  const [depositDialogOpen, setDepositDialogOpen] = useState(false)
  const [selectedDepositChain, setSelectedDepositChain] = useState<GatewayChainConfig | null>(null)
  const [depositAmount, setDepositAmount] = useState('')

  // Transfer dialog state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [selectedTransferChain, setSelectedTransferChain] = useState<GatewayChainConfig | null>(null)
  const [transferAmount, setTransferAmount] = useState('')
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
    if (!selectedTransferChain || !transferAmount || !recipientAddress) {
      toast({
        title: 'Invalid input',
        description: 'Please fill in all fields',
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
      await transfer(selectedTransferChain, transferAmount, recipientAddress)
      toast({
        title: 'Transfer successful!',
        description: `Transferred ${transferAmount} USDC to ${selectedTransferChain.name}`,
      })
      setTransferDialogOpen(false)
      setTransferAmount('')
      setRecipientAddress('')
    } catch (err) {
      toast({
        title: 'Transfer failed',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      })
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

      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Not Connected */}
        {!isConnected && (
          <Card>
            <CardHeader>
              <CardTitle>Connect Your Smart Account</CardTitle>
              <CardDescription>
                Please login to your Circle Smart Account to use Gateway
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Circle Gateway enables cross-chain USDC transfers with a unified balance across multiple chains.
                </AlertDescription>
              </Alert>
              <Button onClick={() => window.location.href = '/circle-account'} className="w-full">
                Go to Circle Account
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Connected View */}
        {isConnected && (
          <div className="space-y-6">
            {/* Consolidated Balance Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Total Gateway Balance</CardTitle>
                    <CardDescription>Unified USDC across all chains</CardDescription>
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
                <div className="text-4xl font-bold mb-4">
                  {isLoading ? (
                    <span className="text-muted-foreground">Loading...</span>
                  ) : (
                    <span>{totalBalance} USDC</span>
                  )}
                </div>

                <div className="flex gap-4">
                  <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex-1">
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Transfer Cross-Chain
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Transfer Cross-Chain</DialogTitle>
                        <DialogDescription>
                          Transfer your unified USDC balance to any supported chain
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="transfer-chain">Destination Chain</Label>
                          <Select
                            onValueChange={(value) => {
                              const chain = SUPPORTED_CHAINS.find(c => c.name === value)
                              setSelectedTransferChain(chain || null)
                            }}
                          >
                            <SelectTrigger id="transfer-chain">
                              <SelectValue placeholder="Select a chain" />
                            </SelectTrigger>
                            <SelectContent>
                              {SUPPORTED_CHAINS.map((chain) => (
                                <SelectItem key={chain.name} value={chain.name}>
                                  {chain.name}
                                </SelectItem>
                              ))}
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
                            onChange={(e) => setRecipientAddress(e.target.value)}
                          />
                        </div>

                        <div>
                          <Label htmlFor="transfer-amount">Amount (USDC)</Label>
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
                            Available: {totalBalance} USDC
                          </p>
                        </div>

                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            Transfer fee: 0.005% + base gas fee. Transfer typically completes in under 500ms.
                          </AlertDescription>
                        </Alert>

                        <Button onClick={handleTransfer} className="w-full" disabled={isLoading}>
                          {isLoading ? 'Transferring...' : 'Transfer'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Per-Chain Balances */}
            <Card>
              <CardHeader>
                <CardTitle>Balances by Chain</CardTitle>
                <CardDescription>
                  View and deposit USDC on individual chains
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {SUPPORTED_CHAINS.map((chainConfig) => {
                    const chainBalance = balances.find(b => b.domain === chainConfig.domain)
                    const walletBalance = chainBalance?.walletBalance || '0'
                    const gatewayBalance = chainBalance?.balance || '0'

                    return (
                      <div
                        key={chainConfig.name}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{chainConfig.name}</h3>
                            {!chainConfig.supportsGateway && (
                              <span className="text-xs bg-muted px-2 py-1 rounded">
                                Gateway N/A
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Domain: {chainConfig.domain}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            {isLoading ? (
                              <p className="text-sm text-muted-foreground">Loading...</p>
                            ) : (
                              <>
                                <div className="mb-1">
                                  <p className="text-xs text-muted-foreground">Wallet</p>
                                  <p className="font-semibold">{parseFloat(walletBalance).toFixed(6)} USDC</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Gateway</p>
                                  <p className="font-semibold text-primary">{parseFloat(gatewayBalance).toFixed(6)} USDC</p>
                                </div>
                              </>
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
                                <Button variant="outline" size="sm">
                                  <Wallet className="h-4 w-4 mr-2" />
                                  Deposit
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

                <Alert className="mt-6">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
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
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Transaction Status</CardTitle>
                    <Button variant="ghost" size="sm" onClick={clearTransaction}>
                      Clear
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <Label className="text-sm font-semibold text-green-600">
                        Transaction Confirmed!
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono break-all">
                        {txHash}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(txHash, 'Transaction Hash')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Section */}
            <Card>
              <CardHeader>
                <CardTitle>How Circle Gateway Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Unified USDC Balance</h4>
                  <p className="text-sm text-muted-foreground">
                    Circle Gateway provides a single, unified USDC balance across all supported chains.
                    You can deposit on any chain and spend from your total balance.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Fast Cross-Chain Transfers</h4>
                  <p className="text-sm text-muted-foreground">
                    Transfers complete in under 500ms once your balance is established. The Gateway
                    automatically routes funds from multiple source chains if needed.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Low Fees</h4>
                  <p className="text-sm text-muted-foreground">
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
