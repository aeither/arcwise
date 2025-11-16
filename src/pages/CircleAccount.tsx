import { useState, useEffect, useMemo } from 'react'
import { useCircleSmartAccount } from '@/hooks/useCircleSmartAccount'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Copy, Send, Wallet, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { arbitrumSepolia, arcTestnet, baseSepolia } from 'wagmi/chains'
import { useSearchParams } from 'react-router-dom'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Only chains that Circle's Modular Wallets SDK actually supports
// Using Wagmi chain configs for explorer info
const SUPPORTED_CHAINS = [
  { id: 84532, name: 'Base Sepolia', path: 'baseSepolia', chain: baseSepolia },
  { id: 421614, name: 'Arbitrum Sepolia', path: 'arbitrumSepolia', chain: arbitrumSepolia },
  { id: 5042002, name: 'Arc Testnet', path: 'arcTestnet', chain: arcTestnet },
  // Note: These are supported by Circle but not yet added to viem chains config
  // { id: 11155420, name: 'Optimism Sepolia', path: 'optimismSepolia' },
  // { id: 80002, name: 'Polygon Amoy', path: 'polygonAmoy' },
  // { id: 43113, name: 'Avalanche Fuji', path: 'avalancheFuji' },
]

// Demo contacts - same as in Index page
const CONTACTS = [
  { name: 'Olivia', address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0' },
  { name: 'Juan', address: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0' },
  { name: 'Lucas', address: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199' },
]

const CircleAccount = () => {
  const [searchParams] = useSearchParams()
  
  // Get chain from URL params, fallback to Base Sepolia (84532)
  const chainFromUrl = searchParams.get('chain')
  const currentChainId = chainFromUrl ? parseInt(chainFromUrl) : 84532
  
  const {
    account,
    credential,
    username,
    isLoading,
    error,
    userOpHash,
    txHash,
    register,
    login,
    logout,
    sendUSDC,
    checkUSDCBalance,
    clearTransaction,
  } = useCircleSmartAccount(currentChainId)

  const { toast } = useToast()

  // Form states
  const [registerUsername, setRegisterUsername] = useState('')
  const [selectedContact, setSelectedContact] = useState<string>('')
  const [transferTo, setTransferTo] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null)

  // Handle contact selection
  const handleContactSelect = (contactName: string) => {
    setSelectedContact(contactName)
    if (contactName === 'custom') {
      setTransferTo('')
    } else {
      const contact = CONTACTS.find(c => c.name === contactName)
      if (contact) {
        setTransferTo(contact.address)
      }
    }
  }

  // Check USDC balance when account is available
  useEffect(() => {
    if (account) {
      checkUSDCBalance()
        .then(setUsdcBalance)
        .catch(() => setUsdcBalance('0'))
    }
  }, [account, checkUSDCBalance])

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
      // Redirect to home page after successful registration
      window.location.href = '/'
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
      // Redirect to home page after successful login
      window.location.href = '/'
    } catch (err) {
      toast({
        title: 'Login failed',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      })
    }
  }


  const handleSendUSDC = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!transferTo || !transferAmount) {
      toast({
        title: 'Invalid input',
        description: 'Please enter recipient address and amount',
        variant: 'destructive',
      })
      return
    }

    if (!transferTo.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({
        title: 'Invalid address',
        description: 'Please enter a valid Ethereum address',
        variant: 'destructive',
      })
      return
    }

    // Check if balance is sufficient
    if (usdcBalance && parseFloat(usdcBalance) < 1) {
      toast({
        title: 'Insufficient USDC',
        description: 'You need at least 1 USDC to send gasless transactions. Please fund your account from the Circle Faucet.',
        variant: 'destructive',
      })
      return
    }

    try {
      await sendUSDC(transferTo as `0x${string}`, transferAmount)
      toast({
        title: 'Transfer successful!',
        description: `Sent ${transferAmount} USDC`,
      })
      // Refresh balance
      const newBalance = await checkUSDCBalance()
      setUsdcBalance(newBalance)
      setSelectedContact('')
      setTransferTo('')
      setTransferAmount('')
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

  const currentChainName = SUPPORTED_CHAINS.find(c => c.id === currentChainId)?.name || 'Unknown'

  // Get chain config from Wagmi chains
  const currentChain = useMemo(() => {
    return SUPPORTED_CHAINS.find(c => c.id === currentChainId)?.chain
  }, [currentChainId])

  const getBlockExplorerUrl = (txHash: string) => {
    const explorerUrl = currentChain?.blockExplorers?.default?.url
    if (!explorerUrl) {
      // Fallback to Base Sepolia if chain not found
      return `https://sepolia.basescan.org/tx/${txHash}`
    }
    // Remove trailing slash if present, then append tx path
    return `${explorerUrl.replace(/\/$/, '')}/tx/${txHash}`
  }

  const getBlockExplorerName = () => {
    return currentChain?.blockExplorers?.default?.name ?? 'Block Explorer'
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Not Authenticated View */}
        {!credential && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sign in to ArcWise</CardTitle>
                <CardDescription>
                  Sign in with Face ID, Touch ID, or fingerprint - no passwords needed!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Register Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Create Account</h3>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter your username"
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Creating Account...' : 'Sign Up with Face ID'}
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
                  <h3 className="text-lg font-semibold mb-4">Already have an account?</h3>
                  <Button onClick={handleLogin} variant="outline" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </div>

                {/* Info */}
                <Alert>
                  <AlertDescription className="text-sm">
                    <strong>Secure & Simple:</strong> Use Face ID or fingerprint to access your account. 
                    No passwords to remember!
                    <br />
                    <span className="text-xs text-muted-foreground mt-1 block">
                      ✨ Built with Circle Modular Wallets & Paymaster for gasless transactions
                    </span>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Features */}
            <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader>
                  <CardTitle className="text-base">🔒 Secure</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Face ID keeps your money safe
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">⚡ Instant</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Send money instantly - no fees
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    (Circle Paymaster)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">🚀 Simple</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    No passwords or recovery phrases
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Authenticated View */}
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

        {account && (
          <div className="space-y-6">
            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle>Your Account</CardTitle>
                <CardDescription>
                  {currentChainName}
                  <span className="text-xs text-muted-foreground ml-2">(Circle Smart Account)</span>
                </CardDescription>
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
                  {usdcBalance && parseFloat(usdcBalance) < 1 && (
                    <p className="text-sm text-orange-600 mt-1">
                      ⚠️ Low balance! You need at least 1 USDC to send gasless transactions.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Send USDC */}
            <Card>
              <CardHeader>
                <CardTitle>Send Money</CardTitle>
                <CardDescription>
                  Send instantly with no fees
                  <span className="text-xs text-muted-foreground ml-1">(powered by Circle Paymaster)</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendUSDC} className="space-y-4">
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
                    <Label htmlFor="to">Recipient Address</Label>
                    <Input
                      id="to"
                      type="text"
                      placeholder="0x..."
                      value={transferTo}
                      onChange={(e) => {
                        setTransferTo(e.target.value)
                        if (selectedContact !== 'custom') {
                          setSelectedContact('custom')
                        }
                      }}
                      disabled={isLoading || (selectedContact !== '' && selectedContact !== 'custom')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount (USDC)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.000001"
                      min="0"
                      placeholder="0.00"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send USDC
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Transaction Status */}
            {(userOpHash || txHash) && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Transaction Status</CardTitle>
                    <Button variant="ghost" size="sm" onClick={clearTransaction}>
                      Clear
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {userOpHash && (
                    <div>
                      <Label className="text-sm text-muted-foreground">User Operation Hash</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono break-all">
                          {userOpHash}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(userOpHash, 'User Op Hash')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {txHash && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <Label className="text-sm font-semibold text-green-600">Transaction Confirmed!</Label>
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
                      <a
                        href={getBlockExplorerUrl(txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary underline mt-2 inline-block"
                      >
                        View on {getBlockExplorerName()} →
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CircleAccount
