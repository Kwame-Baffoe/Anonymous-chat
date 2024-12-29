export interface Message {
  _id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  reactions: { [emoji: string]: string[] };
  attachments?: Attachment[];
  isEdited?: boolean;
  readBy?: string[];
  parentId?: string;
  thread?: Message[];
}

export interface Attachment {
  _id: string;
  filename: string;
  url: string;
  contentType: string;
}
