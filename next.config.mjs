import { createServer } from 'http';
import { parse } from 'url';
import { Server } from 'socket.io';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable WebSocket support
  experimental: {
    esmExternals: 'loose',
  },
  reactStrictMode: true,
  webpack: (config) => {
    config.externals = [...(config.externals || []), { bufferutil: 'bufferutil', 'utf-8-validate': 'utf-8-validate' }];
    return config;
  },
  // Configure Socket.IO path and CORS
  serverOptions: {
    socket: {
      path: '/api/socket',
      connectTimeout: 20000,
      pingInterval: 10000,
      pingTimeout: 20000,
      transports: ['polling', 'websocket'],
    },
  },
  
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
