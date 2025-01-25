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
    <figure className="relative min-w-[300px] flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border p-4 mx-4 bg-white hover:shadow-lg transition-all duration-300">
      <div className="flex flex-col">
        <div className="flex flex-row items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500" />
          <div className="flex flex-col">
            <p className="text-sm font-medium">
              {bottle.sender.slice(0, 6)}...{bottle.sender.slice(-4)}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(Number(bottle.timestamp) * 1000).toLocaleString()}
            </p>
          </div>
        </div>
        <blockquote className="mt-2 text-sm leading-relaxed">{bottle.content}</blockquote>
      </div>
    </figure>
  );
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

  // 添加 fireworks 效果函数
  const triggerFireworks = () => {
    const scalar = 2;
    const heart = confetti.shapeFromText({ text: "❤️", scalar });
    const sparkles = confetti.shapeFromText({ text: "✨", scalar });

    const defaults = {
      spread: 360,
      ticks: 60,
      gravity: 0,
      decay: 0.96,
      startVelocity: 20,
      shapes: [heart, sparkles],
      scalar,
    };

    // 一次完整的烟花展示
    const shootFirework = (delay: number) => {
      setTimeout(() => {
        // 发射爱心
        confetti({
          ...defaults,
          particleCount: 30,
          origin: { x: 0.3, y: 0.5 }
        });

        // 发射闪光
        confetti({
          ...defaults,
          particleCount: 30,
          origin: { x: 0.7, y: 0.5 }
        });

        // 发射圆形粒子
        confetti({
          ...defaults,
          particleCount: 15,
          scalar: scalar / 2,
          shapes: ["circle"],
          origin: { x: 0.5, y: 0.5 }
        });
      }, delay);
    };

    // 连续发射三次，每次间隔 800ms
    shootFirework(0);    // 第一次
    shootFirework(800);  // 第二次
    shootFirework(1600); // 第三次
  };

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
    <div className="pick-bottle">
      <h2>捞取漂流瓶</h2>
      
      {status && (
        <div className={`status-message ${status.includes('失败') ? 'error' : 'success'}`}>
          {status}
        </div>
      )}
      
      <div className="pick-options">
        <button 
          onClick={() => setPickingTargeted(false)}
          className={!pickingTargeted ? 'active' : ''}
        >
          随机捞取 ({Number(availableCount || 0)})
        </button>
        <button 
          onClick={() => setPickingTargeted(true)}
          className={pickingTargeted ? 'active' : ''}
        >
          捞取指定给我的 ({targetedCount ? Number(targetedCount[0]) : 0})
        </button>
      </div>

      <div className="pick-action">
        <button 
          onClick={handlePickBottle}
          disabled={isLoading || 
            (pickingTargeted ? !(targetedCount && Number(targetedCount[0])) : !Number(availableCount))}
        >
          {isLoading ? '捞取中...' : '捞取漂流瓶'}
        </button>
        {!pickingTargeted && (!availableCount || Number(availableCount) === 0) && (
          <p className="error-message">目前没有可以捞取的漂流瓶</p>
        )}
        {pickingTargeted && (!targetedCount || Number(targetedCount[0]) === 0) && (
          <p className="error-message">没有指定给你的漂流瓶</p>
        )}
      </div>

      {/* 漂流瓶展示区域 */}
      {bottle && (
        <div className="relative flex w-full flex-col items-center justify-center overflow-hidden rounded-lg border bg-white mt-6 p-6">
          <BottleCard bottle={bottle} />
        </div>
      )}
    </div>
  );
} 