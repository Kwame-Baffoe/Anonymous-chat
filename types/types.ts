// types/types.ts

import type { NextApiResponse } from 'next';
import type { Server as HTTPServer } from 'http';
import type { Server as SocketIOServer, Socket } from 'socket.io';

export interface NextApiResponseServerIO extends NextApiResponse {
  socket: Socket & {
    server: HTTPServer & {
      io?: SocketIOServer;
    };
  };
}
