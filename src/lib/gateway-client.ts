/**
 * Gateway API Client for interacting with Circle Gateway API
 * Based on Circle Gateway Quickstart guide
 */

import { GATEWAY_API_BASE_URL, CHAINS_BY_DOMAIN } from './gateway-constants'

export interface ChainBalance {
  domain: number
  balance: string
  chain?: string
}

export interface BalancesResponse {
  balances: ChainBalance[]
}

export interface BurnIntent {
  burnIntent: {
    from: number
    to: number
    amount: string
    recipient: string
    nonce: string
  }
  signature: `0x${string}`
}

export interface TransferResponse {
  success: boolean
  message?: string
  attestation?: string
  signature?: string
}

export interface GatewayInfo {
  domains: Array<{
    chain: string
    network: string
    domain: number
    walletContract?: string
    minterContract?: string
  }>
}

export class GatewayClient {
  private baseUrl: string

  constructor(baseUrl: string = GATEWAY_API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  /**
   * Gets info about supported chains and contracts
   */
  async info(): Promise<GatewayInfo> {
    return this.get('/info')
  }

  /**
   * Checks balances for a given depositor across multiple domains
   */
  async balances(
    token: string,
    depositor: string,
    domains?: number[]
  ): Promise<BalancesResponse> {
    if (!domains) {
      domains = Object.keys(CHAINS_BY_DOMAIN).map((d) => parseInt(d))
    }

    return this.post('/balances', {
      token,
      sources: domains.map((domain) => ({ depositor, domain })),
    })
  }

  /**
   * Sends burn intents to the API to retrieve an attestation
   */
  async transfer(burnIntents: BurnIntent[]): Promise<TransferResponse> {
    return this.post('/transfer', burnIntents)
  }

  /**
   * Private method to do a GET request
   */
  private async get(path: string): Promise<any> {
    const url = this.baseUrl + path
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Gateway API error: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Private method to do a POST request
   */
  private async post(path: string, body: any): Promise<any> {
    const url = this.baseUrl + path
    const headers = { 'Content-Type': 'application/json' }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ),
    })

    if (!response.ok) {
      throw new Error(`Gateway API error: ${response.statusText}`)
    }

    return response.json()
  }
}
