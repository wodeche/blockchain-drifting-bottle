import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useBottleHistory } from '../hooks/useBottleHistory';
import { Marquee } from '../components/magicui/marquee';
import { Bottle } from '../contracts/types';

const BottleCard = ({ bottle }: { bottle: Bottle }) => {
  // 添加复制地址的函数
  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      // 可以添加一个提示，但为了保持界面简洁，这里只改变鼠标样式
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  return (
    <figure className="relative min-w-[300px] mx-4 group">
      <div className="absolute -inset-1 bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
      <div className="relative p-4 bg-white rounded-lg border border-pink-100/50 hover:shadow-lg transition-all duration-300">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-purple-400"></div>
            <div className="flex flex-col">
              <p 
                className="text-sm font-medium text-gray-700 hover:text-pink-500 cursor-pointer transition-colors"
                onClick={() => copyAddress(bottle.sender)}
                title="点击复制地址"
              >
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

export default function MyBottles() {
  const { address } = useAccount();
  const { thrownBottles, pickedBottles } = useBottleHistory();

  // 过滤当前用户的漂流瓶
  const myThrownBottles = React.useMemo(() => {
    if (!address) return [];
    return thrownBottles.filter(bottle => 
      bottle.sender.toLowerCase() === address.toLowerCase()
    );
  }, [thrownBottles, address]);

  const myPickedBottles = React.useMemo(() => {
    if (!address) return [];
    return pickedBottles.filter(bottle => 
      bottle.picker.toLowerCase() === address.toLowerCase()
    );
  }, [pickedBottles, address]);

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="cute-card p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4 page-title">
            我的漂流瓶
          </h2>
          <p className="page-subtitle">
            这里收藏着你投放的心意和收获的惊喜
          </p>
        </div>

        <div className="space-y-8">
          <section>
            <h3 className="text-xl font-semibold text-pink-500 mb-4 flex items-center">
              <span className="mr-2">📤</span> 
              我投放的漂流瓶 ({myThrownBottles.length})
            </h3>
            {myThrownBottles.length > 0 ? (
              <div className="relative overflow-hidden rounded-lg border-2 border-pink-100 bg-white/90 backdrop-blur-sm">
                <Marquee 
                  pauseOnHover 
                  className="[--duration:20s] py-4"
                  repeat={2}
                >
                  {myThrownBottles.map((bottle, i) => (
                    <BottleCard key={`thrown-${bottle.id}-${i}`} bottle={bottle} />
                  ))}
                </Marquee>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white/90"></div>
                <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white/90"></div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8 bg-pink-50/50 rounded-lg border-2 border-dashed border-pink-200">
                还没有投放过漂流瓶 💭
              </p>
            )}
          </section>

          <section>
            <h3 className="text-xl font-semibold text-[#4A90E2] mb-4 flex items-center">
              <span className="mr-2">📥</span>
              我捞取的漂流瓶 ({myPickedBottles.length})
            </h3>
            {myPickedBottles.length > 0 ? (
              <div className="relative overflow-hidden rounded-lg border-2 border-[#4A90E2]/20 bg-white/90 backdrop-blur-sm">
                <Marquee 
                  reverse
                  pauseOnHover 
                  className="[--duration:20s] py-4"
                  repeat={2}
                >
                  {myPickedBottles.map((bottle, i) => (
                    <BottleCard key={`picked-${bottle.id}-${i}`} bottle={bottle} />
                  ))}
                </Marquee>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white/90"></div>
                <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white/90"></div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8 bg-[#4A90E2]/5 rounded-lg border-2 border-dashed border-[#4A90E2]/20">
                还没有捞取过漂流瓶 🌊
              </p>
            )}
          </section>
        </div>

        {/* 装饰元素 */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-4 left-4 w-2 h-2 bg-pink-200 rounded-full animate-ping"></div>
          <div className="absolute bottom-4 right-4 w-2 h-2 bg-[#4A90E2] rounded-full animate-ping delay-300"></div>
          <div className="absolute top-1/2 right-4 w-2 h-2 bg-yellow-200 rounded-full animate-ping delay-700"></div>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="mt-8 text-center text-sm text-gray-500 space-y-2">
        <p>💝 每一个漂流瓶都承载着独特的故事</p>
        <p>✨ 让我们继续在区块链上传递温暖与惊喜</p>
      </div>
    </div>
  );
} 