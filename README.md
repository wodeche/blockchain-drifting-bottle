# 区块链漂流瓶

一个基于区块链的 Web3 漂流瓶应用，让用户可以在区块链上传递信息和情感。

## 功能特点

- 📝 投放漂流瓶：写下内容并发送到区块链
  - 支持公开投放
  - 支持指定接收者（内容会被加密）
- 🎣 捞取漂流瓶
  - 随机捞取他人的公开漂流瓶
  - 查看专门发给自己的漂流瓶
- 📜 历史记录：查看自己投放和捞取的漂流瓶历史

## 技术栈

- 前端：React + TypeScript
- 智能合约：Solidity
- Web3 交互：wagmi + viem
- 区块链：Sepolia 测试网

## 合约信息

- 网络：Sepolia 测试网
- 合约地址：`0xac7f0df29dca546f30ed1bf8eac46a53fc41b7c4`
- 功能：
  - 支持内容加密
  - 随机漂流瓶分配
  - 定向投放功能

## 安全特性

- 使用 XOR 加密保护定向漂流瓶内容
- 只有指定接收者可以解密内容
- 完全去中心化的存储和交互

## 许可证

MIT
