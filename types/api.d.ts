// types/api.d.ts
export interface RoomsApiResponse {
  success: boolean;
  rooms?: RoomResponse[];
  error?: string;
}

export interface CreateRoomApiResponse {
  success: boolean;
  room?: RoomResponse;
  error?: string;
}

export interface RoomResponse {
  _id: string;
  name: string;
  createdAt: string;
}
