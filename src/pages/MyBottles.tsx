import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useBottleHistory } from '../hooks/useBottleHistory';
import { Marquee } from '../components/magicui/marquee';
import { Bottle } from '../contracts/types';

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

export default function MyBottles() {
  const [activeTab, setActiveTab] = useState<'thrown' | 'picked'>('thrown');
  const { address } = useAccount();
  const { thrownBottles, pickedBottles } = useBottleHistory();

  // 添加调试日志
  console.log('当前地址:', address);
  console.log('本地存储中的投放记录:', thrownBottles);
  console.log('本地存储中的捞取记录:', pickedBottles);

  // 过滤当前用户的漂流瓶
  const myThrownBottles = thrownBottles.filter(bottle => {
    const matches = bottle.sender.toLowerCase() === address?.toLowerCase();
    console.log('比较:', {
      bottleSender: bottle.sender.toLowerCase(),
      currentAddress: address?.toLowerCase(),
      matches
    });
    return matches;
  });
  const myPickedBottles = pickedBottles.filter(bottle => bottle.picker.toLowerCase() === address?.toLowerCase());

  console.log('过滤后的我的投放:', myThrownBottles);
  console.log('过滤后的我的捞取:', myPickedBottles);

  const bottles = activeTab === 'thrown' ? myThrownBottles : myPickedBottles;

  return (
    <div className="my-bottles">
      <h2>我的漂流瓶</h2>

      <div className="bottle-sections">
        <section>
          <h3>我投放的漂流瓶 ({thrownBottles.length})</h3>
          {thrownBottles.length > 0 ? (
            <div className="relative flex h-[300px] w-full flex-col items-center justify-center overflow-hidden rounded-lg border bg-white mt-6">
              <Marquee 
                pauseOnHover 
                className="[--duration:20s]"
                repeat={2}
              >
                {thrownBottles.map((bottle, i) => (
                  <BottleCard key={`thrown-${bottle.id}-${i}`} bottle={bottle} />
                ))}
              </Marquee>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white"></div>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white"></div>
            </div>
          ) : (
            <p className="no-bottles">还没有投放过漂流瓶</p>
          )}
        </section>

        <section>
          <h3>我捞取的漂流瓶 ({pickedBottles.length})</h3>
          {pickedBottles.length > 0 ? (
            <div className="relative flex h-[300px] w-full flex-col items-center justify-center overflow-hidden rounded-lg border bg-white mt-6">
              <Marquee 
                reverse
                pauseOnHover 
                className="[--duration:20s]"
                repeat={2}
              >
                {pickedBottles.map((bottle, i) => (
                  <BottleCard key={`picked-${bottle.id}-${i}`} bottle={bottle} />
                ))}
              </Marquee>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white"></div>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white"></div>
            </div>
          ) : (
            <p className="no-bottles">还没有捞取过漂流瓶</p>
          )}
        </section>
      </div>
    </div>
  );
} 