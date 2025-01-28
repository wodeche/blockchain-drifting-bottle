import React, { useState } from 'react';
import { useContractWrite, useWaitForTransaction, useAccount } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/config';
import { useBottleStore } from '../hooks/useBottleStore';
import { useBottleHistory } from '../hooks/useBottleHistory';
import { cn } from '../utils/cn';

export default function ThrowBottle() {
  const [content, setContent] = useState('');
  const [targetAddress, setTargetAddress] = useState('');
  const [isThrowing, setIsThrowing] = useState(false);
  const [isThrown, setIsThrown] = useState(false);
  const [status, setStatus] = useState('');
  const maxLength = 200;

  const { address } = useAccount();
  const refetchAvailable = useBottleStore((state) => state.refetchAvailable);
  const addThrownBottle = useBottleHistory((state) => state.addThrownBottle);

  const getCharacterCountColor = () => {
    const ratio = content.length / maxLength;
    if (ratio < 0.7) return 'text-pink-400';
    if (ratio < 0.9) return 'text-yellow-500';
    return 'text-red-500';
  };

  const { 
    write: throwBottle,
    data: throwData,
    isLoading: isWriting,
  } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'throwBottle',
    args: [content, targetAddress || '0x0000000000000000000000000000000000000000'],
    onSuccess(data) {
      setStatus('交易已提交，等待确认...');
    },
    onError(error) {
      setStatus(`投放失败: ${error.message}`);
      setIsThrowing(false);
    }
  });

  const { isLoading: isWaiting } = useWaitForTransaction({
    hash: throwData?.hash,
    onSuccess() {
      setStatus('漂流瓶已成功投放！');
      setIsThrown(true);
      refetchAvailable?.();
      
      // 重置表单
      setTimeout(() => {
        setContent('');
        setTargetAddress('');
        setIsThrowing(false);
        setIsThrown(false);
        setStatus('');
      }, 2000);
    },
    onError(error) {
      setStatus(`交易失败: ${error.message}`);
      setIsThrowing(false);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isThrowing) return;
    
    setIsThrowing(true);
    try {
      // 先添加到历史记录
      addThrownBottle({
        id: Date.now().toString(), // 使用时间戳作为临时ID
        content: content,
        sender: address || '0x0000000000000000000000000000000000000000',
        timestamp: Math.floor(Date.now() / 1000).toString(), // 转换为字符串
        targetReceiver: targetAddress || '0x0000000000000000000000000000000000000000',
        isPicked: false,
        picker: '0x0000000000000000000000000000000000000000'
      });

      await throwBottle?.();
    } catch (error: any) {
      setStatus(`投放失败: ${error.message}`);
      setIsThrowing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className={cn(
        "cute-card p-8 transform transition-all duration-500",
        isThrown && "translate-y-[100vh] rotate-12 opacity-0"
      )}>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4 page-title">
            写下你的心意
          </h2>
          <p className="page-subtitle">
            让你的文字漂向远方，带给他人温暖与惊喜
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, maxLength))}
                className={cn(
                  "cute-input w-full h-48 resize-none transition-all duration-300",
                  "focus:ring-2 focus:ring-pink-200 focus:border-pink-300",
                  "placeholder-gray-400",
                  content.length >= maxLength && "border-red-300 focus:ring-red-200"
                )}
                placeholder="在这里写下你想说的话..."
                disabled={isThrowing}
              />
              <div className={cn(
                "absolute bottom-3 right-3 text-sm transition-colors",
                getCharacterCountColor()
              )}>
                {content.length}/{maxLength}
              </div>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative">
              <input
                type="text"
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                className="cute-input w-full"
                placeholder="指定接收者地址（可选）"
                disabled={isThrowing}
              />
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            <button
              type="submit"
              disabled={!content.trim() || isThrowing}
              className={cn(
                "cute-button group relative",
                "transform transition-all duration-300",
                (isThrowing || !content.trim()) && "opacity-70 cursor-not-allowed",
                content.trim() && !isThrowing && "hover:scale-105"
              )}
            >
              <span className="relative z-10 flex items-center justify-center">
                {isThrowing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    正在投放...
                  </>
                ) : isThrown ? (
                  '漂流瓶已发送'
                ) : (
                  '投放漂流瓶'
                )}
              </span>
            </button>

            {status && (
              <div className={cn(
                "text-center p-3 rounded-lg",
                status.includes('失败') ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
              )}>
                {status}
              </div>
            )}
          </div>
        </form>

        {/* 装饰元素 */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-4 left-4 w-2 h-2 bg-pink-200 rounded-full animate-ping"></div>
          <div className="absolute bottom-4 right-4 w-2 h-2 bg-purple-200 rounded-full animate-ping delay-300"></div>
          <div className="absolute top-1/2 right-4 w-2 h-2 bg-yellow-200 rounded-full animate-ping delay-700"></div>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="mt-8 text-center text-sm text-gray-500 space-y-2">
        <p>💝 你的文字将会带给他人温暖与惊喜</p>
        <p>✨ 同时也可能收到来自陌生人的美好祝愿</p>
      </div>
    </div>
  );
} 