// 漂流瓶的数据结构
export interface Bottle {
  id: string;
  content: string;
  sender: string;
  targetReceiver: string;
  timestamp: string;
  isPicked: boolean;
  picker: string;
}

// 合约事件类型
export interface BottleEvent {
  bottleId: string;
  sender: string;
  timestamp: number;
} 