import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { sepolia, arcTestnet, baseSepolia, arbitrumSepolia, optimismSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'ArcWise',
  projectId: 'YOUR_PROJECT_ID', // Get from WalletConnect Cloud
  chains: [sepolia, arcTestnet, baseSepolia, arbitrumSepolia, optimismSepolia],
  transports: {
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/demo'),
    [baseSepolia.id]: http(),
    [arcTestnet.id]: http(),
    [arbitrumSepolia.id]: http(),
    [optimismSepolia.id]: http(),
  },
});
