import React, { useState, useEffect } from 'react';
import { useContractRead, useContractWrite, useWaitForTransaction, useAccount } from 'wagmi';
import { readContract } from '@wagmi/core';
import { decodeEventLog, Log, createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/config';
import { Bottle } from '../contracts/types';
import { useBottleStore } from '../hooks/useBottleStore';
import { useBottleHistory } from '../hooks/useBottleHistory';
import { Marquee } from '../components/magicui/marquee';
import { cn } from '../utils/cn';
import confetti from "canvas-confetti";

// 创建公共客户端
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http()
});

// 修改事件数据类型
interface BottlePickedEvent {
  eventName: 'BottlePicked';  // 明确指定事件名称
  args: {
    bottleId: string;
    picker: string;
    content: string;
    sender: string;
    timestamp: bigint;
  };
}

interface DecodedEvent {
  eventName: string;
  args: {
    bottleId: string;
    picker: string;
    content: string;
    sender: string;
    timestamp: bigint;
  };
}

// 添加合约返回的漂流瓶类型
interface ContractBottle {
  id: string;
  content: string;
  sender: string;
  targetReceiver: string;
  timestamp: bigint;
  isPicked: boolean;
  picker: string;
}

// 添加类型定义
interface TargetedCountResult {
  0: bigint;
  1: string[];
}

// 创建一个漂流瓶数组来模拟多个漂流瓶
const createBottleRows = (bottle: Bottle | null) => {
  if (!bottle) return { firstRow: [], secondRow: [] };

  // 创建6个相同的漂流瓶来实现滚动效果
  const bottles = Array(6).fill(bottle);
  const midPoint = Math.ceil(bottles.length / 2);

  return {
    firstRow: bottles.slice(0, midPoint),
    secondRow: bottles.slice(midPoint)
  };
};

const BottleCard = ({ bottle }: { bottle: Bottle }) => {
  return (
    <figure className="relative min-w-[300px] mx-4 group">
      <div className="absolute -inset-1 bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
      <div className="relative p-4 bg-white rounded-lg border border-pink-100/50 hover:shadow-lg transition-all duration-300">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-purple-400"></div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-gray-700">
                {bottle.sender.slice(0, 6)}...{bottle.sender.slice(-4)}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(Number(bottle.timestamp) * 1000).toLocaleString()}
              </p>
            </div>
          </div>
          <blockquote className="mt-2 text-sm leading-relaxed text-gray-600">
            {bottle.content}
          </blockquote>
        </div>
      </div>
    </figure>
  );
};

// 添加烟花效果函数
const shootFirework = (delay: number) => {
  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FF8BA7', '#93E4C1', '#FFDDA1', '#C3B1E1']
    });
  }, delay);
};

const triggerFireworks = () => {
  shootFirework(0);    // 第一次
  shootFirework(800);  // 第二次
  shootFirework(1600); // 第三次
};

export default function PickBottle() {
  const [pickingTargeted, setPickingTargeted] = useState(false);
  const [bottle, setBottle] = useState<Bottle | null>(null);
  const [status, setStatus] = useState('');

  const setRefetchAvailable = useBottleStore((state) => state.setRefetchAvailable);
  const addPickedBottle = useBottleHistory((state) => state.addPickedBottle);

  // 只保留一个账户获取
  const { address: userAddress } = useAccount();

  // 获取可用漂流瓶数量
  const { data: availableCount, refetch: refetchAvailable } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getAvailableBottleCount',
    watch: true,
    onError(error) {
      console.error('Error getting available count:', error);
    }
  }) as { data: number, refetch: () => void };

  // 每 5 秒自动刷新一次
  useEffect(() => {
    const interval = setInterval(() => {
      refetchAvailable();
    }, 5000);

    return () => clearInterval(interval);
  }, [refetchAvailable]);

  // 保存 refetchAvailable 到全局状态
  useEffect(() => {
    setRefetchAvailable(refetchAvailable);
  }, [refetchAvailable, setRefetchAvailable]);

  // 获取总漂流瓶数量用于调试
  const { data: totalCount } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getBottleCount',
    watch: true,
  }) as { data: number };

  // 获取指定给我的漂流瓶数量
  const { data: targetedCount, refetch: refetchTargetedCount } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getMyTargetedBottleCount',
    args: [userAddress],
    enabled: !!userAddress,
    onError(error) {
      console.error('Error getting targeted count:', error);
    }
  }) as { data: TargetedCountResult, refetch: () => void };

  // 随机捞取漂流瓶
  const {
    data: randomPickData,
    write: pickRandomBottle,
    isLoading: isPickingRandom,
  } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'pickBottle',
    onSuccess(data) {
      setStatus('交易已提交，等待确认...');
    },
    onError(error) {
      setStatus(`捞取失败: ${error.message}`);
    }
  });

  // 捞取指定给我的漂流瓶
  const {
    data: targetedPickData,
    write: pickTargetedBottle,
    isLoading: isPickingTargeted,
  } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'pickTargetedBottle',
    onSuccess(data) {
      setStatus('交易已提交，等待确认...');
    },
    onError(error) {
      setStatus(`捞取失败: ${error.message}`);
    }
  });

  const { isLoading: isWaitingRandom } = useWaitForTransaction({
    hash: randomPickData?.hash,
    onSuccess: async (data) => {
      try {
        // 解析事件日志
        const events = data.logs.map(log => {
          try {
            const decodedLog = decodeEventLog({
              abi: CONTRACT_ABI,
              data: log.data,
              topics: log.topics,
            }) as BottlePickedEvent;

            if (decodedLog.eventName === 'BottlePicked' && 'bottleId' in decodedLog.args) {
              const bottle = {
                id: decodedLog.args.bottleId,
                content: decodedLog.args.content,
                sender: decodedLog.args.sender,
                targetReceiver: '0x0000000000000000000000000000000000000000',
                timestamp: decodedLog.args.timestamp.toString(),
                isPicked: true,
                picker: decodedLog.args.picker
              };

              addPickedBottle(bottle);
              setBottle(bottle);  // 设置当前捞到的瓶子
              setStatus('成功捞取到漂流瓶！');

              // 触发烟花效果
              triggerFireworks();
            }

            return decodedLog;
          } catch (e) {
            return null;
          }
        }).filter((event): event is BottlePickedEvent => event !== null);

        console.log('解码后的事件:', events);
        setTimeout(() => setStatus(''), 3000);
      } catch (error: any) {
        console.error('Error processing transaction:', error);
        setStatus(`处理交易失败: ${error.message}`);
      }
    },
    onError(error) {
      setStatus(`交易失败: ${error.message}`);
    }
  });

  const { isLoading: isWaitingTargeted } = useWaitForTransaction({
    hash: targetedPickData?.hash,
    onSuccess(data) {
      try {
        const events = data.logs.map(log => {
          try {
            const decodedLog = decodeEventLog({
              abi: CONTRACT_ABI,
              data: log.data,
              topics: log.topics,
            }) as BottlePickedEvent;

            if (decodedLog.eventName === 'BottlePicked' && 'bottleId' in decodedLog.args) {
              const bottle = {
                id: decodedLog.args.bottleId,
                content: decodedLog.args.content,
                sender: decodedLog.args.sender,
                targetReceiver: '0x0000000000000000000000000000000000000000',
                timestamp: decodedLog.args.timestamp.toString(),
                isPicked: true,
                picker: decodedLog.args.picker
              };

              addPickedBottle(bottle);
              setBottle(bottle);
              setStatus('成功捞取到漂流瓶！');

              // 在这里添加烟花效果
              triggerFireworks();
            }

            return decodedLog;
          } catch (e) {
            return null;
          }
        }).filter((event): event is BottlePickedEvent => event !== null);

        console.log('解码后的事件:', events);
        setTimeout(() => setStatus(''), 3000);
      } catch (error: unknown) {  // 明确指定错误类型
        if (error instanceof Error) {  // 类型守卫
          if (error.message.includes('could not be found')) {
            setStatus('漂流瓶可能已经成功捞取，请查看链上记录');
            setTimeout(() => setStatus(''), 3000);
          } else {
            setStatus(`捞取失败: ${error.message}`);
          }
        } else {
          setStatus('捞取失败: 未知错误');
        }
      }
    },
    confirmations: 1,
    timeout: 30000
  });

  const isLoading = isPickingRandom || isWaitingRandom || isPickingTargeted || isWaitingTargeted;

  const handlePickBottle = async () => {
    try {
      // 移除这里的立即触发
      // triggerFireworks();

      if (pickingTargeted) {
        await pickTargetedBottle?.();
      } else {
        await pickRandomBottle?.();
      }
    } catch (error: any) {
      console.error('Error picking bottle:', error);
      setStatus(`捞取失败: ${error.message}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="cute-card p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-purple-500 mb-4">
            🎣 捞取漂流瓶
          </h2>
          <p className="text-gray-500 text-sm">
            每个漂流瓶都藏着一份独特的心意，等待被发现 ✨
          </p>
        </div>

        {status && (
          <div className={cn(
            "text-center p-3 rounded-lg mb-6",
            status.includes('失败') ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
          )}>
            {status}
          </div>
        )}

        <div className="space-y-6">
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setPickingTargeted(false);
                handlePickBottle();
              }}
              disabled={isLoading || !Number(availableCount)}
              className={cn(
                "cute-button group relative flex-1",
                "transform transition-all duration-300",
                isLoading && "opacity-70 cursor-not-allowed",
                !isLoading && "hover:scale-105",
                !pickingTargeted && "bg-gradient-to-r from-pink-400 to-pink-500"
              )}
            >
              <span className="relative z-10 flex items-center justify-center">
                {isLoading && !pickingTargeted ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    捞取中...
                  </>
                ) : (
                  <>随机捞取 🎣 ({Number(availableCount || 0)})</>
                )}
              </span>
            </button>
            <button
              onClick={() => {
                setPickingTargeted(true);
                handlePickBottle();
              }}
              disabled={isLoading || !(targetedCount && Number(targetedCount[0]))}
              className={cn(
                "cute-button group relative flex-1",
                "transform transition-all duration-300",
                isLoading && "opacity-70 cursor-not-allowed",
                !isLoading && "hover:scale-105",
                pickingTargeted && "bg-gradient-to-r from-purple-400 to-purple-500"
              )}
            >
              <span className="relative z-10 flex items-center justify-center">
                {isLoading && pickingTargeted ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    捞取中...
                  </>
                ) : (
                  <>捞取指定给我的 💌 ({targetedCount ? Number(targetedCount[0]) : 0})</>
                )}
              </span>
            </button>
          </div>

          {!pickingTargeted && (!availableCount || Number(availableCount) === 0) && (
            <p className="text-center text-gray-500 py-4 bg-pink-50/50 rounded-lg border-2 border-dashed border-pink-200">
              目前海面上没有漂流瓶 🌊
            </p>
          )}
          {pickingTargeted && (!targetedCount || Number(targetedCount[0]) === 0) && (
            <p className="text-center text-gray-500 py-4 bg-purple-50/50 rounded-lg border-2 border-dashed border-purple-200">
              没有指定给你的漂流瓶 💌
            </p>
          )}
        </div>

        {/* 漂流瓶展示区域 */}
        {bottle && (
          <div className="relative mt-8 transform transition-all duration-500 hover:scale-105">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg blur opacity-25"></div>
            <div className="relative p-6 bg-white rounded-lg border border-pink-100/50">
              <BottleCard bottle={bottle} />
            </div>
          </div>
        )}

        {/* 装饰元素 */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-4 left-4 w-2 h-2 bg-pink-200 rounded-full animate-ping"></div>
          <div className="absolute bottom-4 right-4 w-2 h-2 bg-purple-200 rounded-full animate-ping delay-300"></div>
          <div className="absolute top-1/2 right-4 w-2 h-2 bg-yellow-200 rounded-full animate-ping delay-700"></div>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="mt-8 text-center text-sm text-gray-500 space-y-2">
        <p>💝 每个漂流瓶都承载着独特的故事</p>
        <p>✨ 让我们在区块链上发现更多惊喜</p>
      </div>
    </div>
  );
} 