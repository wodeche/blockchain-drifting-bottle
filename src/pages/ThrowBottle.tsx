import React, { useState } from 'react';
import { useAccount, useContractWrite, useWaitForTransaction } from 'wagmi';
import { decodeEventLog } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/config';
import { useBottleStore } from '../hooks/useBottleStore';
import { publicClient } from '../utils/wagmi';
import { useBottleHistory, debugBottleHistory } from '../hooks/useBottleHistory';

// 修改事件类型定义
interface ThrowBottleEvent {
  eventName: 'BottleThrown';  // 明确指定事件名称
  args: {
    bottleId: string;
    sender: string;
    targetReceiver: string;
    timestamp: bigint;
  };
}

interface ThrowBottleResult {
  eventName: 'ThrowBottleResult';  // 明确指定事件名称
  args: {
    success: boolean;
    debugMessages: string[];
  };
}

export default function ThrowBottle() {
  const [content, setContent] = useState('');
  const [targetAddress, setTargetAddress] = useState('');
  const [status, setStatus] = useState('');
  const { address } = useAccount();
  const refetchAvailable = useBottleStore((state) => state.refetchAvailable);
  const addThrownBottle = useBottleHistory((state) => state.addThrownBottle);
  
  const { 
    data: throwData,
    write: throwBottle, 
    isLoading: isThrowingBottle 
  } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'throwBottle',
    args: [content, targetAddress || '0x0000000000000000000000000000000000000000'],
    onSuccess(data) {
      // 在交易发送时就记录到本地存储
      const bottle = {
        id: `local_${Date.now()}`,
        content: content,
        sender: address || '0x0000000000000000000000000000000000000000',
        targetReceiver: targetAddress || '0x0000000000000000000000000000000000000000',
        timestamp: (Date.now() / 1000).toString(),
        isPicked: false,
        picker: '0x0000000000000000000000000000000000000000'
      };
      
      console.log('准备添加到本地存储的漂流瓶:', bottle);
      console.log('添加前的存储状态:', debugBottleHistory());
      addThrownBottle(bottle);
      console.log('添加后的存储状态:', debugBottleHistory());

      console.log('投放交易数据:', data);
      console.log('投放内容:', content);
      console.log('目标地址:', targetAddress);
      console.log('交易哈希:', data.hash);
      setStatus('漂流瓶已投放，等待确认...');
      setContent('');  // 清空输入
      setTargetAddress('');  // 清空目标地址
    },
    onError(error) {
      console.error('投放错误:', error);
      setStatus(`投放失败: ${error.message}`);
    }
  });

  const { isLoading: isWaitingThrow } = useWaitForTransaction({
    hash: throwData?.hash,
    onSuccess(data) {
      console.log('投放交易收据:', data);
      try {
        console.log('开始处理交易日志...');
        console.log('日志数量:', data.logs.length);
        
        const events = data.logs.map(log => {
          try {
            console.log('处理日志:', log);
            const decodedLog = decodeEventLog({
              abi: CONTRACT_ABI,
              data: log.data,
              topics: log.topics,
            }) as (ThrowBottleEvent | ThrowBottleResult);
            
            console.log('解码后的日志:', decodedLog);
            
            // 使用类型守卫
            if (decodedLog.eventName === 'BottleThrown' && 'bottleId' in decodedLog.args) {
              console.log('找到 BottleThrown 事件');
              const bottle = {
                id: decodedLog.args.bottleId,
                content: content,
                sender: decodedLog.args.sender,
                targetReceiver: decodedLog.args.targetReceiver,
                timestamp: decodedLog.args.timestamp.toString(),
                isPicked: false,
                picker: '0x0000000000000000000000000000000000000000'
              };
              
              console.log('准备添加到本地存储的漂流瓶:', bottle);
              console.log('添加前的存储状态:', debugBottleHistory());
              addThrownBottle(bottle);
              console.log('添加后的存储状态:', debugBottleHistory());
              
              // 立即检查存储
              const currentState = debugBottleHistory();
              console.log('当前存储中的投放记录数:', currentState.thrownBottles.length);
              console.log('最新投放的漂流瓶:', currentState.thrownBottles[currentState.thrownBottles.length - 1]);
            }
            
            return decodedLog;
          } catch (e) {
            console.error('解码日志失败:', e);
            return null;
          }
        }).filter((event): event is (ThrowBottleEvent | ThrowBottleResult) => event !== null);
        
        console.log('处理后的事件:', events);
        setContent('');
        setTargetAddress('');
        setStatus('漂流瓶已成功投放！');
        setTimeout(() => setStatus(''), 3000);
      } catch (error) {
        console.error('处理交易收据错误:', error);
      }
    },
    onError(error) {
      console.error('等待交易错误:', error);
      setStatus(`投放失败: ${error.message}`);
    }
  });

  const isLoading = isThrowingBottle || isWaitingThrow;

  const handleThrowBottle = async () => {
    if (!content.trim()) {
      setStatus('请输入内容');
      return;
    }
    try {
      await throwBottle?.();
    } catch (error: any) {
      console.error('投放错误:', error);
      setStatus(`投放失败: ${error.message}`);
    }
  };

  return (
    <div className="throw-bottle">
      <h2>投放漂流瓶</h2>
      
      {status && (
        <div className={`status-message ${status.includes('失败') ? 'error' : 'success'}`}>
          {status}
        </div>
      )}

      <textarea 
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={500}
        placeholder="写下你想说的话..."
        disabled={isLoading}
      />
      <div className="word-count">{content.length}/500</div>
      
      <input
        type="text"
        value={targetAddress}
        onChange={(e) => setTargetAddress(e.target.value)}
        placeholder="指定接收者地址（可选）"
        disabled={isLoading}
      />
      
      <button 
        onClick={handleThrowBottle}
        disabled={isLoading || content.length === 0}
      >
        {isLoading ? '投放中...' : '投放漂流瓶'}
      </button>
    </div>
  );
} 