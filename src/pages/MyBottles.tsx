import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useBottleHistory } from '../hooks/useBottleHistory';

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

      <div className="bottle-tabs">
        <button 
          onClick={() => setActiveTab('thrown')}
          className={activeTab === 'thrown' ? 'active' : ''}
        >
          我投放的 ({myThrownBottles.length})
        </button>
        <button 
          onClick={() => setActiveTab('picked')}
          className={activeTab === 'picked' ? 'active' : ''}
        >
          我捞取的 ({myPickedBottles.length})
        </button>
      </div>

      <div className="bottle-list">
        {bottles && bottles.length > 0 ? (
          bottles.map((bottle, index) => (
            <div key={index} className="bottle-item">
              <p className="bottle-content">{bottle.content}</p>
              <div className="bottle-info">
                {activeTab === 'thrown' ? (
                  <>
                    <span>接收者: {bottle.targetReceiver && 
                      (bottle.targetReceiver === '0x0000000000000000000000000000000000000000'
                        ? '随机'
                        : `${bottle.targetReceiver.slice(0, 6)}...${bottle.targetReceiver.slice(-4)}`)
                    }</span>
                  </>
                ) : (
                  <span>来自: {bottle.sender && `${bottle.sender.slice(0, 6)}...${bottle.sender.slice(-4)}`}</span>
                )}
                <span>时间: {new Date(Number(bottle.timestamp) * 1000).toLocaleString()}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="no-bottles">
            {activeTab === 'thrown' ? '你还没有投放过漂流瓶' : '你还没有捞取过漂流瓶'}
          </p>
        )}
      </div>
    </div>
  );
} 