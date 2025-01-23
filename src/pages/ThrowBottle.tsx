import React, { useState } from 'react';
import { useAccount, useContractWrite, useWaitForTransaction } from 'wagmi';
import { decodeEventLog } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/config';
import { useBottleStore } from '../hooks/useBottleStore';
import { publicClient } from '../utils/wagmi';

// 添加类型定义
interface ThrowBottleEvent {
  eventName: string;
  args: {
    bottleId: string;
    sender: string;
    targetReceiver: string;
    timestamp: bigint;
  };
}

interface ThrowBottleResult {
  eventName: string;
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
      console.log('投放交易数据:', data);
      console.log('投放内容:', content);
      console.log('目标地址:', targetAddress);
      console.log('交易哈希:', data.hash);
      setStatus('漂流瓶已投放，等待确认...');
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
        const events = data.logs.map(log => {
          try {
            const decodedLog = decodeEventLog({
              abi: CONTRACT_ABI,
              data: log.data,
              topics: log.topics,
            }) as (ThrowBottleEvent | ThrowBottleResult);  // 添加类型断言
            console.log('解码的事件:', decodedLog);
            return decodedLog;
          } catch (e) {
            return null;
          }
        }).filter((event): event is (ThrowBottleEvent | ThrowBottleResult) => event !== null);  // 类型保护
        
        console.log('投放事件:', events);
        
        // 显示调试消息
        const result = events.find(event => 'debugMessages' in event.args) as ThrowBottleResult | undefined;
        if (result?.args?.debugMessages) {
          console.log('投放调试消息:', result.args.debugMessages);
        }
      } catch (error) {
        console.error('解码错误:', error);
      }
      
      setStatus('漂流瓶已成功投放！');
      setContent('');
      setTimeout(() => setStatus(''), 3000);
    },
    onError(error) {
      console.error('等待交易错误:', error);
      setStatus(`投放失败: ${error.message}`);
    }
  });

  const isLoading = isThrowingBottle || isWaitingThrow;

  const handleThrowBottle = async () => {
    try {
      if (targetAddress && targetAddress.toLowerCase() === address?.toLowerCase()) {
        setStatus('不能给自己投放漂流瓶');
        return;
      }

      if (targetAddress && !targetAddress.match(/^0x[0-9a-fA-F]{40}$/)) {
        setStatus('请输入有效的以太坊地址');
        return;
      }

      await throwBottle?.();
    } catch (error: any) {
      console.error('Error throwing bottle:', error);
      setStatus(`投放失败: ${error.message}`);
    }
  };

  // 添加调试按钮
  const debugThrow = async () => {
    console.log('当前内容:', content);
    console.log('目标地址:', targetAddress);
    console.log('发送者地址:', address);
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

      <button 
        onClick={debugThrow}
        disabled={isLoading || content.length === 0}
      >
        {isLoading ? '调试中...' : '调试投放'}
      </button>
    </div>
  );
} 