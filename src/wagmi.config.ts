import { configureChains, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { getDefaultWallets } from '@rainbow-me/rainbowkit';

// 配置链和提供商
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [sepolia],
  [
    alchemyProvider({ 
      apiKey: '5nIubmwDF9mgPqdln0jgvua3MgzsxLZn',
    })
  ],
  {
    retryCount: 3,           // 重试次数
    retryDelay: 1000,        // 重试延迟（毫秒）
    pollingInterval: 4000,    // 轮询间隔（毫秒）
    stallTimeout: 30000        // 使用 stallTimeout 替代 timeout
  }
);

// 获取默认钱包配置
const { connectors } = getDefaultWallets({
  appName: 'Web3 漂流瓶',
  projectId: 'b8c64fa5b412e56e72ad38abebd7e9fd',
  chains
});

// 创建 wagmi 配置
const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

export { chains, config }; 