// types/env.d.ts
declare namespace NodeJS {
    interface ProcessEnv {
      MONGODB_URI: string;
      NEXT_PUBLIC_SOCKET_IO_URL: string;
      // Add other environment variables here
    }
  }
  