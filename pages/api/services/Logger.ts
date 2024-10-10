// services/Logger.ts

export class Logger {
    static log(message: string, ...optionalParams: any[]) {
      console.log(`[LOG]: ${message}`, ...optionalParams);
    }
  
    static error(message: string, ...optionalParams: any[]) {
      console.error(`[ERROR]: ${message}`, ...optionalParams);
    }
  
    static warn(message: string, ...optionalParams: any[]) {
      console.warn(`[WARN]: ${message}`, ...optionalParams);
    }
  }
  