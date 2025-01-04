import React from 'react';
import { useAccount, useContractRead } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/config';
import { Bottle } from '../contracts/types';

export default function Profile() {
  const { address } = useAccount();
  
  const { data: myThrownBottles = [] } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getMyThrownBottles',
    args: [address],
  }) as { data: Bottle[] | undefined };

  const { data: myPickedBottles = [] } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getMyPickedBottles',
    args: [address],
  }) as { data: Bottle[] | undefined };

  return (
    <div className="profile">
      <h2>我的漂流瓶</h2>
      <div className="bottles-section">
        <h3>我投放的漂流瓶</h3>
        <div className="bottle-list">
          {myThrownBottles.map((bottle: Bottle) => (
            <div key={bottle.id} className="bottle-item">
              <p>{bottle.content}</p>
              <span>{new Date(Number(bottle.timestamp) * 1000).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bottles-section">
        <h3>我捞到的漂流瓶</h3>
        <div className="bottle-list">
          {myPickedBottles.map((bottle: Bottle) => (
            <div key={bottle.id} className="bottle-item">
              <p>{bottle.content}</p>
              <span>{new Date(Number(bottle.timestamp) * 1000).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 