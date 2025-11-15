import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { arbitrumSepolia, arcTestnet, baseSepolia, sepolia, avalancheFuji } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'ArcWise',
  projectId: 'YOUR_PROJECT_ID', // Get from WalletConnect Cloud
  chains: [sepolia, baseSepolia, arbitrumSepolia, arcTestnet, avalancheFuji],
  transports: {
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/demo'),
    [baseSepolia.id]: http(),
    [avalancheFuji.id]: http(),
    [arbitrumSepolia.id]: http(),
    [arcTestnet.id]: http(),
  },
});
