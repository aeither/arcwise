/**
 * ABIs for Circle Gateway contracts
 */

// Gateway Wallet ABI (simplified - only necessary functions)
export const gatewayWalletAbi = [
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [
      { name: 'depositor', type: 'address' },
      { name: 'token', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// Gateway Minter ABI (simplified)
export const gatewayMinterAbi = [
  {
    type: 'function',
    name: 'gatewayMint',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'attestation', type: 'bytes' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
] as const
