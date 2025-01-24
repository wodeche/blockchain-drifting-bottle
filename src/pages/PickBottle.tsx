import React, { useState, useEffect } from 'react';
import { useContractRead, useContractWrite, useWaitForTransaction, useAccount } from 'wagmi';
import { readContract } from '@wagmi/core';
import { decodeEventLog, Log, createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/config';
import { Bottle } from '../contracts/types';
import { useBottleStore } from '../hooks/useBottleStore';
import { useBottleHistory } from '../hooks/useBottleHistory';

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
    onSuccess(data) {
      try {
        console.log('交易确认成功');
        
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
              setBottle(bottle);  // 使用同一个对象更新状态
              setStatus('成功捞取到漂流瓶！');
            }
            
            return decodedLog;
          } catch (e) {
            return null;
          }
        }).filter((event): event is BottlePickedEvent => event !== null);
        
        console.log('解码后的事件:', events);
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
    </div>
  );
} 