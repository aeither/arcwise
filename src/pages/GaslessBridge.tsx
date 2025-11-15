import { useState, useEffect } from 'react'
import { useCircleSmartAccount } from '@/hooks/useCircleSmartAccount'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Copy, LogOut, Zap, CheckCircle, Clock, AlertCircle, ArrowLeftRight, RefreshCw, Info, Loader2, ExternalLink } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useGaslessBridge, CHAIN_NAMES, ARC_CHAIN_ID, SEPOLIA_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID, ARBITRUM_SEPOLIA_CHAIN_ID } from '../hooks/useGaslessBridge'
import { isAddress } from 'viem'

// Source chains that can bridge to Arc Testnet
const SOURCE_CHAINS = [
  { id: SEPOLIA_CHAIN_ID, name: CHAIN_NAMES[SEPOLIA_CHAIN_ID] },
  { id: BASE_SEPOLIA_CHAIN_ID, name: CHAIN_NAMES[BASE_SEPOLIA_CHAIN_ID] },
  { id: ARBITRUM_SEPOLIA_CHAIN_ID, name: CHAIN_NAMES[ARBITRUM_SEPOLIA_CHAIN_ID] },
]

// Block explorer URLs
const BLOCK_EXPLORERS: Record<number, string> = {
  11155111: 'https://sepolia.etherscan.io',
  5042002: 'https://testnet.arcscan.app',
  84532: 'https://sepolia.basescan.org',
  421614: 'https://sepolia.arbiscan.io',
}

const GaslessBridge = () => {
  // Circle Smart Account hooks
  const {
    account,
    credential,
    username,
    isLoading: isSmartAccountLoading,
    error: smartAccountError,
    register,
    login,
    logout,
    checkUSDCBalance,
  } = useCircleSmartAccount()

  // Gasless Bridge hooks - uses ONLY Circle Smart Account (no MetaMask!)
  const { state: bridgeState, tokenBalance, isLoadingBalance, balanceError, fetchBalance: fetchTokenBalance, bridge: gaslessBridge, reset: resetBridge } = useGaslessBridge()

  const { toast } = useToast()

  // Form states
  const [registerUsername, setRegisterUsername] = useState('')
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null)

  // Bridge form states
  const [bridgeAmount, setBridgeAmount] = useState('')
  const [sourceChainId, setSourceChainId] = useState(BASE_SEPOLIA_CHAIN_ID)
  const [useDifferentRecipient, setUseDifferentRecipient] = useState(false)
  const [recipientAddress, setRecipientAddress] = useState('')

  const destinationChainId = ARC_CHAIN_ID
  const sourceChainName = CHAIN_NAMES[sourceChainId]
  const destinationChainName = CHAIN_NAMES[destinationChainId]

  const isValidRecipientAddress = !useDifferentRecipient || (recipientAddress && isAddress(recipientAddress))

  // Check USDC balance when smart account is available
  useEffect(() => {
    if (account) {
      checkUSDCBalance()
        .then(setUsdcBalance)
        .catch(() => setUsdcBalance('0'))
    }
  }, [account, checkUSDCBalance])

  // Fetch bridge token balance when account or source chain changes
  useEffect(() => {
    if (account?.address) {
      console.log('Fetching USDC balance for smart account:', account.address)
      fetchTokenBalance(sourceChainId)
    }
  }, [account?.address, sourceChainId, fetchTokenBalance])

  // Bridge balance display
  const displayBridgeBalance = isLoadingBalance ? 'Loading...' :
    (tokenBalance && tokenBalance !== '0') ? tokenBalance : '0.00'
  const numericBridgeBalance = isLoadingBalance ? 0 : parseFloat(displayBridgeBalance) || 0

  // Smart Account handlers
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!registerUsername.trim()) {
      toast({
        title: 'Username required',
        description: 'Please enter a username to register',
        variant: 'destructive',
      })
      return
    }

    try {
      await register(registerUsername)
      toast({
        title: 'Registration successful!',
        description: 'Your Circle Smart Account has been created',
      })
      setRegisterUsername('')
    } catch (err) {
      toast({
        title: 'Registration failed',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      })
    }
  }

  const handleLogin = async () => {
    try {
      await login()
      toast({
        title: 'Login successful!',
        description: 'Welcome back to your Circle Smart Account',
      })
    } catch (err) {
      toast({
        title: 'Login failed',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      })
    }
  }

  const handleLogout = () => {
    logout()
    toast({
      title: 'Logged out',
      description: 'You have been logged out of your Circle Smart Account',
    })
  }

  const handleBridge = async () => {
    if (!account) {
      toast({
        title: 'Account required',
        description: 'Please create or login to your Circle Smart Account first',
        variant: 'destructive',
      })
      return
    }

    if (!bridgeAmount || parseFloat(bridgeAmount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      })
      return
    }

    if (useDifferentRecipient && !isValidRecipientAddress) {
      toast({
        title: 'Invalid address',
        description: 'Please enter a valid recipient address',
        variant: 'destructive',
      })
      return
    }

    const finalRecipientAddress = useDifferentRecipient ? recipientAddress : undefined

    try {
      await gaslessBridge(bridgeAmount, sourceChainId, destinationChainId, finalRecipientAddress)
      toast({
        title: 'Bridge successful!',
        description: `Bridged ${bridgeAmount} USDC (gasless)`,
      })
    } catch (err) {
      toast({
        title: 'Bridge failed',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      })
    }
  }

  // Save bridge transaction to localStorage
  useEffect(() => {
    if (bridgeState.step === 'success' && bridgeState.sourceChainId && bridgeState.destinationChainId && bridgeAmount) {
      const transaction = {
        id: `${Date.now()}`,
        type: 'bridge',
        amount: bridgeAmount,
        fromNetwork: CHAIN_NAMES[bridgeState.sourceChainId],
        toNetwork: CHAIN_NAMES[bridgeState.destinationChainId],
        timestamp: new Date().toISOString(),
        sourceTxHash: bridgeState.sourceTxHash,
        receiveTxHash: bridgeState.receiveTxHash,
      }

      const existingTransactions = JSON.parse(localStorage.getItem('bridgeTransactions') || '[]')
      const isAlreadySaved = existingTransactions.some((t: any) => t.id === transaction.id)
      if (!isAlreadySaved) {
        existingTransactions.unshift(transaction)
        localStorage.setItem('bridgeTransactions', JSON.stringify(existingTransactions.slice(0, 10)))
      }
    }
  }, [bridgeState.step, bridgeState.sourceChainId, bridgeState.destinationChainId, bridgeAmount, bridgeState.sourceTxHash, bridgeState.receiveTxHash])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <Header>
        {account && (
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        )}
      </Header>

      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Error Alert */}
        {smartAccountError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{smartAccountError}</AlertDescription>
          </Alert>
        )}

        {/* Not Authenticated View */}
        {!credential && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-6 w-6 text-primary" />
                  <CardTitle>Gasless Bridge to Arc Testnet</CardTitle>
                </div>
                <CardDescription>
                  Create a gasless smart account to bridge USDC without paying gas fees
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Register Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">New User? Register</h3>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter your username"
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(e.target.value)}
                        disabled={isSmartAccountLoading}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSmartAccountLoading}>
                      {isSmartAccountLoading ? 'Registering...' : 'Register with Passkey'}
                    </Button>
                  </form>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                {/* Login Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Already have an account? Login</h3>
                  <Button onClick={handleLogin} variant="outline" className="w-full" disabled={isSmartAccountLoading}>
                    {isSmartAccountLoading ? 'Logging in...' : 'Login with Passkey'}
                  </Button>
                </div>

                {/* Info */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>What is a Passkey?</strong> A passkey uses your device's biometric authentication (like Face ID or fingerprint)
                    to securely create and access your smart account. Bridge USDC without paying gas fees!
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Features */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Secure</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Biometric authentication keeps your account safe
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Gasless</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Bridge USDC without paying gas fees
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Simple</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    No seed phrases or complex wallets to manage
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Authenticated View - Creating Account */}
        {credential && !account && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-lg font-medium">Creating your smart account...</p>
                <p className="text-sm text-muted-foreground mt-2">This will only take a moment</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bridge Interface - Account Created */}
        {account && (
          <div className="space-y-6">
            {/* Account Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Your Smart Account</CardTitle>
                <CardDescription>Base Sepolia Testnet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {username && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Username</Label>
                    <p className="text-lg font-medium">{username}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm text-muted-foreground">Account Address</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 text-sm bg-muted px-3 py-2 rounded font-mono break-all">
                      {account.address}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(account.address, 'Address')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">USDC Balance</Label>
                  <p className="text-lg font-medium">
                    {usdcBalance !== null ? `${usdcBalance} USDC` : 'Loading...'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Bridge Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-6 w-6 text-primary" />
                  <CardTitle className="text-2xl">Gasless Bridge to Arc</CardTitle>
                </div>
                <CardDescription>
                  Transfer USDC from testnet chains to Arc Testnet without gas fees
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Source Chain Selection */}
                <div className="space-y-2">
                  <Label>From Chain</Label>
                  <Select
                    value={sourceChainId.toString()}
                    onValueChange={(value) => setSourceChainId(parseInt(value))}
                    disabled={bridgeState.isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_CHAINS.map((chain) => (
                        <SelectItem key={chain.id} value={chain.id.toString()}>
                          {chain.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fixed Destination */}
                <div className="flex justify-center">
                  <ArrowLeftRight size={18} className="text-muted-foreground" />
                </div>

                <div className="space-y-2">
                  <Label>To Chain</Label>
                  <div className="px-4 py-3 bg-muted rounded-lg">
                    <span className="font-semibold">{destinationChainName}</span>
                  </div>
                </div>

                {/* Token Selection (USDC only) */}
                <div className="space-y-2">
                  <Label>Token</Label>
                  <div className="px-4 py-3 bg-muted rounded-lg">
                    <span className="font-semibold">USDC</span>
                    <span className="text-sm text-muted-foreground ml-2">(USD Coin)</span>
                  </div>
                </div>

                {/* Balance Display */}
                {isLoadingBalance ? (
                  <Alert>
                    <Loader2 size={16} className="animate-spin" />
                    <AlertDescription className="ml-2">Loading balance...</AlertDescription>
                  </Alert>
                ) : balanceError ? (
                  <Alert variant="destructive">
                    <AlertCircle size={16} />
                    <AlertDescription className="ml-2">{balanceError}</AlertDescription>
                  </Alert>
                ) : (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground">{sourceChainName} USDC Balance</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => fetchTokenBalance(sourceChainId)}
                        disabled={isLoadingBalance}
                        title="Refresh balance"
                      >
                        <RefreshCw size={14} className={isLoadingBalance ? 'animate-spin' : ''} />
                      </Button>
                    </div>
                    <p className="text-lg font-semibold">{displayBridgeBalance} USDC</p>
                  </div>
                )}

                {/* Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="bridge-amount">Amount</Label>
                  <Input
                    id="bridge-amount"
                    type="number"
                    placeholder="0.00"
                    value={bridgeAmount}
                    onChange={(e) => setBridgeAmount(e.target.value)}
                    disabled={bridgeState.isLoading}
                  />
                  {parseFloat(bridgeAmount) > numericBridgeBalance && (
                    <p className="text-xs text-destructive">Amount exceeds balance</p>
                  )}
                </div>

                {/* Recipient Address Option */}
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="differentRecipient"
                      checked={useDifferentRecipient}
                      onCheckedChange={(checked) => setUseDifferentRecipient(checked as boolean)}
                      disabled={bridgeState.isLoading}
                    />
                    <Label
                      htmlFor="differentRecipient"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Send to a different wallet address
                    </Label>
                  </div>

                  {useDifferentRecipient && (
                    <div className="space-y-2">
                      <Label htmlFor="recipientAddress">Recipient Address</Label>
                      <Input
                        id="recipientAddress"
                        type="text"
                        placeholder="0x..."
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        disabled={bridgeState.isLoading}
                        className={recipientAddress && !isAddress(recipientAddress) ? 'border-destructive' : ''}
                      />
                      {recipientAddress && !isAddress(recipientAddress) && (
                        <p className="text-xs text-destructive">Invalid Ethereum address</p>
                      )}
                      {recipientAddress && isAddress(recipientAddress) && (
                        <p className="text-xs text-green-600">Valid address</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Messages */}
                {bridgeState.error && (
                  <Alert variant="destructive">
                    <AlertCircle size={16} />
                    <AlertDescription className="ml-2">{bridgeState.error}</AlertDescription>
                  </Alert>
                )}

                {bridgeState.isLoading && bridgeState.step !== 'success' && (
                  <Alert>
                    <Loader2 size={16} className="animate-spin" />
                    <AlertDescription className="ml-2">
                      {bridgeState.step === 'approving' && 'Approving USDC (Gasless)...'}
                      {bridgeState.step === 'bridging' && 'Executing bridge (Gasless)...'}
                      {bridgeState.step === 'waiting' && 'Waiting for completion...'}
                      {bridgeState.step === 'idle' && 'Initializing...'}
                    </AlertDescription>
                  </Alert>
                )}

                {bridgeState.step === 'success' && bridgeState.sourceChainId && bridgeState.destinationChainId && (
                  <Alert className="border-green-500 text-green-700 dark:text-green-400">
                    <CheckCircle size={16} />
                    <div className="ml-2">
                      <AlertDescription className="font-semibold">Bridge Successful!</AlertDescription>
                      <p className="text-xs mt-1">
                        USDC successfully transferred from {CHAIN_NAMES[bridgeState.sourceChainId]} to {CHAIN_NAMES[bridgeState.destinationChainId]}
                        {useDifferentRecipient && recipientAddress && (
                          <>
                            <br />
                            <span className="font-medium">Recipient: </span>
                            {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
                          </>
                        )}
                      </p>

                      {/* Transaction Links */}
                      <div className="space-y-1 mt-3 pt-3 border-t border-green-400/20">
                        {bridgeState.sourceTxHash && BLOCK_EXPLORERS[bridgeState.sourceChainId] && (
                          <a
                            href={`${BLOCK_EXPLORERS[bridgeState.sourceChainId]}/tx/${bridgeState.sourceTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs hover:underline"
                          >
                            <span>View {CHAIN_NAMES[bridgeState.sourceChainId]} Tx</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                        {bridgeState.receiveTxHash && BLOCK_EXPLORERS[bridgeState.destinationChainId] && (
                          <a
                            href={`${BLOCK_EXPLORERS[bridgeState.destinationChainId]}/tx/${bridgeState.receiveTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs hover:underline"
                          >
                            <span>View {CHAIN_NAMES[bridgeState.destinationChainId]} Tx</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  </Alert>
                )}

                {/* Bridge Button */}
                <Button
                  onClick={handleBridge}
                  disabled={bridgeState.isLoading || !bridgeAmount || parseFloat(bridgeAmount) <= 0 || parseFloat(bridgeAmount) > numericBridgeBalance || !isValidRecipientAddress}
                  className="w-full"
                >
                  {bridgeState.isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" />
                      Bridging...
                    </>
                  ) : bridgeState.step === 'success' ? (
                    'Bridge Complete'
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      {`Bridge ${bridgeAmount || '0'} USDC (Gasless)`}
                    </>
                  )}
                </Button>

                {/* Reset Button (after success) */}
                {bridgeState.step === 'success' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetBridge()
                      setBridgeAmount('')
                      setUseDifferentRecipient(false)
                      setRecipientAddress('')
                    }}
                    className="w-full"
                  >
                    Bridge Again
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Info Box */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground space-y-2">
                  <p className="font-semibold">Gasless Bridge Benefits:</p>
                  <p>• No gas fees - All transactions are sponsored by Circle Paymaster</p>
                  <p>• Secure - Your smart account is protected by biometric authentication</p>
                  <p>• Fast - Bridge completes in under 1 minute</p>

                  <p className="mt-3 pt-3 border-t font-semibold">
                    How to get test USDC:
                  </p>
                  <p>1. Visit <a
                    href="https://faucet.circle.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline font-semibold"
                  >
                    Circle Faucet
                  </a></p>
                  <p>2. Select your source chain (e.g., Base Sepolia)</p>
                  <p>3. Request USDC to your smart account address</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default GaslessBridge
