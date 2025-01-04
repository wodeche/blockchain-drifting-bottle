import React, { useState, useEffect } from 'react';
import { useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi';
import { readContract } from '@wagmi/core';
import { decodeEventLog, Log } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/config';
import { Bottle } from '../contracts/types';

// 定义事件数据类型
interface BottlePickedEvent {
  bottleId: string;
  content: string;
  sender: string;
  timestamp: bigint;
  picker: string;
}

export default function PickBottle() {
  const [pickingTargeted, setPickingTargeted] = useState(false);
  const [bottle, setBottle] = useState<Bottle | null>(null);

  // 获取可用漂流瓶数量
  const { data: availableCount, refetch: refetchAvailable } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getAvailableBottleCount',
    watch: true,
    onSuccess(data) {
      console.log('Available bottles:', data);
    },
    onError(error) {
      console.error('Error getting available count:', error);
    }
  }) as { data: number, refetch: () => void };

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

  useEffect(() => {
    // 每次组件加载时刷新数据
    refetchAvailable();
  }, [refetchAvailable]);

  // 获取指定给我的漂流瓶数量
  const { data: targetedCount } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getMyTargetedBottleCount',
    watch: true, // 实时更新数据
  }) as { data: number };

  // 随机捞取漂流瓶
  const { 
    data: randomPickData,
    write: pickRandomBottle, 
    isLoading: isPickingRandom,
    isSuccess: isRandomSuccess
  } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'pickBottle',
    onSuccess(data) {
      console.log('Transaction submitted:', data);
    },
    onError(error) {
      console.error('Error:', error);
    }
  });

  // 捞取指定给我的漂流瓶
  const { 
    data: targetedPickData,
    write: pickTargetedBottle, 
    isLoading: isPickingTargeted,
    isSuccess: isTargetedSuccess
  } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'pickTargetedBottle',
    onSuccess(data) {
      console.log('Transaction submitted:', data);
    },
    onError(error) {
      console.error('Error:', error);
    }
  });

  const { isLoading: isWaitingRandom } = useWaitForTransaction({
    hash: randomPickData?.hash,
    onSuccess(data) {
      console.log('Random pick transaction confirmed:', data);
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
    },
  });

  const { isLoading: isWaitingTargeted } = useWaitForTransaction({
    hash: targetedPickData?.hash,
    onSuccess(data) {
      console.log('Targeted pick transaction confirmed:', data);
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
    },
  });

  const isLoading = isPickingRandom || isWaitingRandom || isPickingTargeted || isWaitingTargeted;

  const handlePickBottle = async () => {
    try {
      if (pickingTargeted) {
        await pickTargetedBottle?.();
      } else {
        await pickRandomBottle?.();
      }
    } catch (error) {
      console.error('Error picking bottle:', error);
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
        });
        console.log(`Bottle ${i}:`, result);
      } catch (error) {
        console.error(`Error getting bottle ${i}:`, error);
      }
    }
  };

  return (
    <div className="pick-bottle">
      <h2>捞取漂流瓶</h2>
      
      <div className="pick-options">
        <button 
          onClick={() => setPickingTargeted(false)}
          className={!pickingTargeted ? 'active' : ''}
        >
          随机捞取 ({availableCount || 0})
        </button>
        <button 
          onClick={() => setPickingTargeted(true)}
          className={pickingTargeted ? 'active' : ''}
        >
          捞取指定给我的 ({targetedCount || 0})
        </button>
      </div>

      <div className="pick-action">
        <button 
          onClick={handlePickBottle}
          disabled={isLoading || 
            (pickingTargeted ? !targetedCount : !availableCount)}
        >
          {isLoading ? '捞取中...' : '捞取漂流瓶'}
        </button>
        {!pickingTargeted && availableCount === 0 && (
          <p className="error-message">目前没有可以捞取的漂流瓶</p>
        )}
        {pickingTargeted && targetedCount === 0 && (
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
    </div>
  );
} 