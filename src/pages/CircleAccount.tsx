import { useState, useEffect } from 'react'
import { useCircleSmartAccount } from '@/hooks/useCircleSmartAccount'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Copy, LogOut, Send, Wallet, CheckCircle, Clock, AlertCircle } from 'lucide-react'

const CircleAccount = () => {
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
  } = useCircleSmartAccount()

  const { toast } = useToast()

  // Form states
  const [registerUsername, setRegisterUsername] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null)

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
                <CardTitle>Welcome to Circle Smart Account</CardTitle>
                <CardDescription>
                  Create a gasless smart account using your device's biometric authentication (Face ID, Touch ID, or Windows Hello)
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
                        disabled={isLoading}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Registering...' : 'Register with Passkey'}
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
                  <Button onClick={handleLogin} variant="outline" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Login with Passkey'}
                  </Button>
                </div>

                {/* Info */}
                <Alert>
                  <AlertDescription className="text-sm">
                    <strong>What is a Passkey?</strong> A passkey uses your device's biometric authentication (like Face ID or fingerprint)
                    to securely create and access your smart account. No passwords needed!
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
                    Biometric authentication keeps your account safe
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">⛽ Gasless</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Send USDC without paying gas fees
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">🚀 Simple</CardTitle>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Smart Account</CardTitle>
                    <CardDescription>Base Sepolia Testnet</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
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

                <Alert className="border-orange-500 bg-orange-50">
                  <AlertDescription className="text-sm">
                    <strong>⚠️ IMPORTANT:</strong> Before sending USDC, you must fund this account with test USDC:
                    <ol className="mt-2 ml-4 list-decimal space-y-1">
                      <li>Copy the account address above</li>
                      <li>Go to <a
                        href="https://faucet.circle.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline font-semibold"
                      >
                        Circle Faucet
                      </a></li>
                      <li>Select "Base Sepolia" network</li>
                      <li>Paste your account address and request USDC</li>
                      <li>Wait ~1 minute for the USDC to arrive</li>
                    </ol>
                    <p className="mt-2 font-semibold">You need at least 1 USDC to send gasless transactions!</p>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Send USDC */}
            <Card>
              <CardHeader>
                <CardTitle>Send USDC (Gasless)</CardTitle>
                <CardDescription>
                  Transfer USDC without paying gas fees - sponsored by Circle Paymaster
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendUSDC} className="space-y-4">
                  <div>
                    <Label htmlFor="to">Recipient Address</Label>
                    <Input
                      id="to"
                      type="text"
                      placeholder="0x..."
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      disabled={isLoading}
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
                        href={`https://sepolia.basescan.org/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary underline mt-2 inline-block"
                      >
                        View on BaseScan →
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
