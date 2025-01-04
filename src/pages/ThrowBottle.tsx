import React, { useState } from 'react';
import { useAccount, useContractWrite, useWaitForTransaction } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/config';

export default function ThrowBottle() {
  const [content, setContent] = useState('');
  const [targetAddress, setTargetAddress] = useState('');
  const { address } = useAccount();
  
  const { 
    data: throwData,
    write: throwBottle, 
    isLoading: isThrowingBottle 
  } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'throwBottle',
    args: [content, targetAddress || '0x0000000000000000000000000000000000000000'],
  });

  const { isLoading: isWaiting } = useWaitForTransaction({
    hash: throwData?.hash,
  });

  const isLoading = isThrowingBottle || isWaiting;

  return (
    <div className="throw-bottle">
      <h2>投放漂流瓶</h2>
      <textarea 
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={500}
        placeholder="写下你想说的话..."
      />
      <div className="word-count">{content.length}/500</div>
      
      <input
        type="text"
        value={targetAddress}
        onChange={(e) => setTargetAddress(e.target.value)}
        placeholder="指定接收者地址（可选）"
      />
      
      <button 
        onClick={() => throwBottle?.()}
        disabled={isLoading || content.length === 0}
      >
        {isLoading ? '投放中...' : '投放漂流瓶'}
      </button>
    </div>
  );
} 