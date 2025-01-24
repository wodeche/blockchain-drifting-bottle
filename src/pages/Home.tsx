import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="home">
      <h1>区块链漂流瓶</h1>
      <div className="feature-cards">
        <Link to="/throw" className="feature-card">
          <h2>投放漂流瓶</h2>
          <p>写下你的心情，让它随区块链漂流</p>
        </Link>
        <Link to="/pick" className="feature-card">
          <h2>捞取漂流瓶</h2>
          <p>看看谁给你留了一个惊喜</p>
        </Link>
        <Link to="/my-bottles" className="feature-card">
          <h2>我的漂流瓶</h2>
          <p>查看我投放和捞取的漂流瓶</p>
        </Link>
      </div>
    </div>
  );
} 