import React, { useState, useEffect } from 'react';
import { useContractRead, useContractWrite, useWaitForTransaction, useAccount } from 'wagmi';
import { readContract } from '@wagmi/core';
import { decodeEventLog, Log, createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/config';
import { Bottle } from '../contracts/types';
import { useBottleStore } from '../hooks/useBottleStore';

// 创建公共客户端
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http()
});

// 修改事件数据类型
interface BottlePickedEvent {
  bottleId: string;
  content: string;
  sender: string;
  timestamp: bigint;
  picker: string;
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

// 添加类型定义
interface BottleDetails {
  id: string;
  sender: string;
  isPicked: boolean;
  picker: string;
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
interface DebugTargetedResult {
  indices: bigint[];
  isPicked: boolean[];
  targetReceivers: string[];
}

// 添加类型定义
interface BottleTargetResult {
  bottleTarget: string;
  isPicked: boolean;
  currentUser: string;
}

// 添加类型定义
interface TargetedCountResult {
  count: bigint;
  debugMessages: string[];
}

export default function PickBottle() {
  const [pickingTargeted, setPickingTargeted] = useState(false);
  const [bottle, setBottle] = useState<Bottle | null>(null);
  const [status, setStatus] = useState('');

  const setRefetchAvailable = useBottleStore((state) => state.setRefetchAvailable);

  // 只保留一个账户获取
  const { address: userAddress } = useAccount();

  // 获取可用漂流瓶数量
  const { data: availableCount, refetch: refetchAvailable } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getAvailableBottleCount',
    watch: true,
    onSuccess(data) {
      console.log('Available bottles raw:', data); // 添加原始数据日志
      console.log('Available bottles number:', Number(data));
    },
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
    onSuccess(data) {
      console.log('Total bottles:', data);
    }
  }) as { data: number };

  // 获取指定给我的漂流瓶数量
  const { data: targetedCount, refetch: refetchTargetedCount } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getMyTargetedBottleCount',
    args: [userAddress],  // 传入用户地址作为参数
    enabled: !!userAddress,
    onSuccess(data: [bigint, string[]]) {
      console.log('未捞取的指定漂流瓶数量:', Number(data[0]));
      console.log('调试消息:', data[1]);
      console.log('使用的账户地址:', userAddress);
    },
    onError(error) {
      console.error('Error getting targeted count:', error);
    }
  });

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
    onSuccess(data) {
      try {
        console.log('交易确认成功');
        
        // 从交易数据中获取漂流瓶内容
        const events = data.logs.map(log => {
          try {
            return decodeEventLog({
              abi: CONTRACT_ABI,
              data: log.data,
              topics: log.topics,
            }) as DecodedEvent;
          } catch (e) {
            console.log('解码日志失败:', e);
            return null;
          }
        }).filter((event): event is DecodedEvent => event !== null);
        
        console.log('解码后的事件:', events);
        
        // 找到 BottlePicked 事件
        const pickedEvent = events.find(e => e.eventName === 'BottlePicked');
        if (pickedEvent) {
          const bottleData = pickedEvent.args;
          setBottle({
            id: bottleData.bottleId,
            content: bottleData.content,
            sender: bottleData.sender,
            timestamp: bottleData.timestamp.toString(),
            isPicked: true,
            picker: bottleData.picker
          });
          setStatus('成功捞取到漂流瓶！');
        }
      } catch (error) {
        console.error('处理错误:', error);
        setStatus('获取漂流瓶内容失败');
      }
    },
    confirmations: 1,
    timeout: 30000
  });

  const { isLoading: isWaitingTargeted } = useWaitForTransaction({
    hash: targetedPickData?.hash,
    onSuccess(data) {
      setStatus('成功捞取到漂流瓶！');
      // 获取捞取的漂流瓶内容
      const events = data.logs.map(log => {
        try {
          const event = decodeEventLog({
            abi: CONTRACT_ABI,
            data: log.data,
            topics: log.topics,
          });
          return event.args as unknown as BottlePickedEvent;
        } catch (e) {
          return null;
        }
      }).filter(Boolean);

      console.log('Events:', events);
      // 更新 UI 显示捞取的内容
      if (events.length > 0 && events[0]) {
        const bottleData = events[0];
        setBottle({
          id: bottleData.bottleId,
          content: bottleData.content,
          sender: bottleData.sender,
          timestamp: bottleData.timestamp.toString(),
          isPicked: true,
          picker: bottleData.picker
        });
      }
      setTimeout(() => setStatus(''), 3000);
    },
    onError(error) {
      if (error.message.includes('could not be found')) {
        setStatus('漂流瓶可能已经成功捞取，请查看链上记录');
        setTimeout(() => setStatus(''), 3000);
      } else {
        setStatus(`捞取失败: ${error.message}`);
      }
    },
    confirmations: 1,
    timeout: 30000
  });

  const isLoading = isPickingRandom || isWaitingRandom || isPickingTargeted || isWaitingTargeted;

  const handlePickBottle = async () => {
    try {
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

  // 添加调试按钮
  const debugBottles = async () => {
    const total = Number(totalCount || 0);
    console.log('Total bottles:', total);
    
    for (let i = 0; i < total; i++) {
      try {
        const result = await readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'getBottleDetails',
          args: [i],
        }) as [string, string, boolean, string]; // 添加类型断言

        console.log(`Bottle ${i}:`, {
          id: result[0],
          sender: result[1],
          isPicked: result[2],
          picker: result[3]
        } as BottleDetails);
      } catch (error) {
        console.error(`Error getting bottle ${i}:`, error);
      }
    }
  };

  // 在组件顶部添加调试日志
  useEffect(() => {
    console.log('Current availableCount:', availableCount);
    console.log('Button should be disabled:', !availableCount);
  }, [availableCount]);

  // 手动获取可用数量
  const checkAvailableBottles = async () => {
    try {
      const result = await readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getAvailableBottleCount',
      });
      console.log('Manual check available bottles:', result);
    } catch (error) {
      console.error('Manual check error:', error);
    }
  };

  // 在组件加载和每次状态变化时检查
  useEffect(() => {
    checkAvailableBottles();
  }, []);

  // 添加 bottle 状态变化的监听
  useEffect(() => {
    console.log('漂流瓶状态更新:', bottle);
  }, [bottle]);

  // 修改调试函数
  const debugTargetedBottles = async () => {
    if (!userAddress) {
      console.error('No account connected');
      return;
    }

    try {
      const data = await readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getMyTargetedBottleCount',
        args: [userAddress],
      }) as [bigint, string[]];
      
      console.log('未捞取的指定漂流瓶数量:', Number(data[0]));
      console.log('调试消息:', data[1]);
      console.log('使用的账户地址:', userAddress);
    } catch (error) {
      console.error('调试错误:', error);
    }
  };

  // 修改调试函数
  const debugUserTargeted = async () => {
    try {
      const result = await readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'debugUserTargetedBottles',
        args: [userAddress]
      }) as [bigint[], boolean[], string[]];
      
      console.log('调试用户指定漂流瓶:', {
        indices: result[0],
        isPicked: result[1],
        targetReceivers: result[2]
      });
      console.log('当前账户:', userAddress);
    } catch (error) {
      console.error('调试错误:', error);
    }
  };

  // 修改调试函数
  const debugBottleTarget = async (index: number) => {
    try {
      const result = await readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'debugBottleTarget',
        args: [index]
      }) as [string, boolean, string];  // 添加类型断言
      
      console.log('漂流瓶目标信息:', {
        bottleTarget: result[0],
        isPicked: result[1],
        currentUser: result[2]
      } as BottleTargetResult);
    } catch (error) {
      console.error('调试错误:', error);
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

      {/* 显示捞取结果 */}
      {bottle && (
        <div className="bottle-content">
          <p className="bottle-text">{bottle.content}</p>
          <div className="bottle-info">
            <span>来自: {bottle.sender}</span>
            <span>时间: {new Date(Number(bottle.timestamp) * 1000).toLocaleString()}</span>
          </div>
        </div>
      )}

      {process.env.NODE_ENV === 'development' && (
        <button onClick={debugBottles} style={{ marginTop: '20px' }}>
          Debug Bottles
        </button>
      )}

      {process.env.NODE_ENV === 'development' && (
        <button onClick={debugTargetedBottles} style={{ marginTop: '20px' }}>
          Debug Targeted Bottles
        </button>
      )}

      {process.env.NODE_ENV === 'development' && (
        <button onClick={debugUserTargeted} style={{ marginTop: '20px' }}>
          Debug User Targeted
        </button>
      )}
    </div>
  );
} 