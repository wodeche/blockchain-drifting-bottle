import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

// 创建公共客户端，使用 Alchemy 节点
export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://eth-sepolia.g.alchemy.com/v2/5nIubmwDF9mgPqdln0jgvua3MgzsxLZn'),
  batch: {
    multicall: true
  }
}); 