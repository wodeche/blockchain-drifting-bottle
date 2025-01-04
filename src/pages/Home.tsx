import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="home">
      <h1>欢迎来到 Web3 漂流瓶</h1>
      <div className="feature-cards">
        <Link to="/throw" className="feature-card">
          <h2>投放漂流瓶</h2>
          <p>写下你想说的话，让它随波逐流...</p>
        </Link>
        <Link to="/pick" className="feature-card">
          <h2>捞取漂流瓶</h2>
          <p>看看谁给你留言了？</p>
        </Link>
        <Link to="/profile" className="feature-card">
          <h2>我的漂流瓶</h2>
          <p>查看我的投放和捞取记录</p>
        </Link>
      </div>
    </div>
  );
} 