import React from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import './styles/app.css';
import {
  getDefaultWallets,
  RainbowKitProvider,
  ConnectButton,
} from '@rainbow-me/rainbowkit';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import ThrowBottle from './pages/ThrowBottle';
import PickBottle from './pages/PickBottle';
import Profile from './pages/Profile';

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet, sepolia],
  [publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: 'Web3 漂流瓶',
  projectId: 'b8c64fa5b412e56e72ad38abebd7e9fd',
  chains
});

const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient
});

function App() {
  return (
    <WagmiConfig config={config}>
      <RainbowKitProvider chains={chains}>
        <Router>
          <div className="App">
            <header className="App-header">
              <nav>
                <Link to="/" className="logo">Web3 漂流瓶</Link>
                <div className="nav-links">
                  <Link to="/throw">投放漂流瓶</Link>
                  <Link to="/pick">捞取漂流瓶</Link>
                  <Link to="/profile">我的漂流瓶</Link>
                </div>
                <ConnectButton />
              </nav>
            </header>

            <main className="container">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/throw" element={<ThrowBottle />} />
                <Route path="/pick" element={<PickBottle />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </Router>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default App;
