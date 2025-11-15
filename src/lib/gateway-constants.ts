/**
 * Circle Gateway constants and chain configurations
 * Based on Circle Gateway Quickstart guide
 */

import { sepolia, baseSepolia, arcTestnet } from 'viem/chains'
import { Chain, createPublicClient, http } from 'viem'

// Gateway API Base URL
export const GATEWAY_API_BASE_URL = "https://gateway-api-testnet.circle.com/v1"

// USDC token decimals
export const USDC_DECIMALS = 6

// Domain identifiers for Circle Gateway
// See https://developers.circle.com/cctp/supported-domains
export const DOMAINS = {
  sepolia: 0,
  avalancheFuji: 1,
  baseSepolia: 6,
  monadTestnet: 15,
  starknetTestnet: 25,
  arcTestnet: 26,
} as const

// Human-readable chain names by domain (testnets only)
export const CHAINS_BY_DOMAIN: Record<number, string> = {
  0: "Ethereum Sepolia",
  1: "Avalanche Fuji",
  6: "Base Sepolia",
  15: "Monad Testnet",
  25: "Starknet Testnet",
  26: "Arc Testnet",
}

// Contract addresses for Gateway
export const GATEWAY_WALLET_ADDRESS = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9" as const
export const GATEWAY_MINTER_ADDRESS = "0x0000000000000000000000000000000000000000" as const // Update with actual minter address

// USDC contract addresses by chain
export const USDC_ADDRESSES = {
  sepolia: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as `0x${string}`,
  baseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`,
  arcTestnet: "0x3600000000000000000000000000000000000000" as `0x${string}`,
  // Add more chains as needed
} as const

// Chain configurations for Gateway
export interface GatewayChainConfig {
  chain: Chain
  name: string
  domain: number
  currency: string
  usdcAddress: `0x${string}`
  gatewayWalletAddress: `0x${string}`
  blockExplorerUrl: string
  supportsGateway: boolean // Whether this chain is supported by Circle Gateway API
}

export const SUPPORTED_CHAINS: GatewayChainConfig[] = [
  {
    chain: sepolia,
    name: "Ethereum Sepolia",
    domain: DOMAINS.sepolia,
    currency: "ETH",
    usdcAddress: USDC_ADDRESSES.sepolia,
    gatewayWalletAddress: GATEWAY_WALLET_ADDRESS,
    blockExplorerUrl: "https://sepolia.etherscan.io",
    supportsGateway: true,
  },
  {
    chain: baseSepolia,
    name: "Base Sepolia",
    domain: DOMAINS.baseSepolia,
    currency: "ETH",
    usdcAddress: USDC_ADDRESSES.baseSepolia,
    gatewayWalletAddress: GATEWAY_WALLET_ADDRESS,
    blockExplorerUrl: "https://sepolia.basescan.org",
    supportsGateway: true,
  },
  {
    chain: arcTestnet,
    name: "Arc Testnet",
    domain: DOMAINS.arcTestnet,
    currency: "ETH",
    usdcAddress: USDC_ADDRESSES.arcTestnet,
    gatewayWalletAddress: GATEWAY_WALLET_ADDRESS,
    blockExplorerUrl: "https://testnet.arcscan.app",
    supportsGateway: true, // Arc Testnet is officially supported (Domain 26)
  },
]

// Helper function to get chain config by domain
export function getChainConfigByDomain(domain: number): GatewayChainConfig | undefined {
  return SUPPORTED_CHAINS.find(config => config.domain === domain)
}

// Helper function to get chain config by chain ID
export function getChainConfigByChainId(chainId: number): GatewayChainConfig | undefined {
  return SUPPORTED_CHAINS.find(config => config.chain.id === chainId)
}

// Create clients for each chain
export function createChainClient(chainConfig: GatewayChainConfig) {
  return createPublicClient({
    chain: chainConfig.chain,
    transport: http(),
  })
}
