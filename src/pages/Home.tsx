import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../utils/cn';

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="cute-card p-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-pink-500 mb-4">
            🧧 新年漂流瓶
          </h1>
          <p className="text-gray-500">
            在区块链上传递新年祝福，发现惊喜 ✨
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link to="/throw" className="group">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
              <div className="relative p-6 bg-white rounded-lg border border-pink-100/50 hover:shadow-lg transition-all duration-300">
                <div className="text-center space-y-3">
                  <div className="text-3xl">📝</div>
                  <h2 className="text-xl font-semibold text-pink-500">投放漂流瓶</h2>
                  <p className="text-sm text-gray-500">
                    写下你的心意，让它漂向远方
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/pick" className="group">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
              <div className="relative p-6 bg-white rounded-lg border border-purple-100/50 hover:shadow-lg transition-all duration-300">
                <div className="text-center space-y-3">
                  <div className="text-3xl">🎣</div>
                  <h2 className="text-xl font-semibold text-purple-500">捞取漂流瓶</h2>
                  <p className="text-sm text-gray-500">
                    发现来自陌生人的惊喜
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/my-bottles" className="group md:col-span-2">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-100 via-pink-100 to-purple-100 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
              <div className="relative p-6 bg-white rounded-lg border border-yellow-100/50 hover:shadow-lg transition-all duration-300">
                <div className="text-center space-y-3">
                  <div className="text-3xl">💝</div>
                  <h2 className="text-xl font-semibold text-yellow-600">我的漂流瓶</h2>
                  <p className="text-sm text-gray-500">
                    查看你的漂流瓶历史记录
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* 装饰元素 */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-4 left-4 w-2 h-2 bg-pink-200 rounded-full animate-ping"></div>
          <div className="absolute bottom-4 right-4 w-2 h-2 bg-purple-200 rounded-full animate-ping delay-300"></div>
          <div className="absolute top-1/2 right-4 w-2 h-2 bg-yellow-200 rounded-full animate-ping delay-700"></div>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="mt-8 text-center text-sm text-gray-500 space-y-2">
        <p>💫 在区块链上留下永恒的记忆</p>
        <p>🌊 让温暖与惊喜在这里传递</p>
      </div>
    </div>
  );
} 