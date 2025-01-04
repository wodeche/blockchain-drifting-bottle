import { ethers } from 'ethers';

// 转换 Wei 到 Ether
export const weiToEther = (wei: string): string => {
  return ethers.utils.formatEther(wei);
};

// 转换 Ether 到 Wei
export const etherToWei = (ether: string): string => {
  return ethers.utils.parseEther(ether).toString();
}; 