import { useCallback, useRef } from 'react';
import Peer from 'simple-peer';
import { Socket } from 'socket.io-client';
import { Logger } from '../utils/Logger';

interface UseCallHandlersProps {
  socket: Socket | null;
  onCallStateChange: (isInCall: boolean) => void;
  onLocalStream: (stream: MediaStream | null) => void;
  onRemoteStream: (stream: MediaStream | null) => void;
}

export const useCallHandlers = ({
  socket,
  onCallStateChange,
  onLocalStream,
  onRemoteStream,
}: UseCallHandlersProps) => {
  const peerRef = useRef<Peer.Instance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const initiateCall = useCallback(
    async (type: 'audio' | 'video', roomId: string) => {
      if (!socket) {
        throw new Error('Socket connection not available');
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video',
        });
        streamRef.current = stream;
        onLocalStream(stream);

        peerRef.current = new Peer({
          initiator: true,
          trickle: false,
          stream,
        });

        peerRef.current.on('signal', (signalData) => {
          socket.emit('initiateCall', {
            roomId,
            type,
            signalData,
          });
        });

        peerRef.current.on('stream', (remoteStream: MediaStream) => {
          onRemoteStream(remoteStream);
        });

        onCallStateChange(true);
        return stream;
      } catch (error) {
        Logger.error('Failed to get local stream:', error);
        throw new Error('Failed to access camera/microphone');
      }
    },
    [socket, onCallStateChange]
  );

  const acceptCall = useCallback(
    async (data: { from: string; type: 'audio' | 'video'; signal: any }) => {
      if (!socket) {
        throw new Error('Socket connection not available');
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: data.type === 'video',
        });
        streamRef.current = stream;
        onLocalStream(stream);

        peerRef.current = new Peer({
          initiator: false,
          trickle: false,
          stream,
        });

        peerRef.current.on('signal', (signalData) => {
          socket.emit('acceptCall', {
            to: data.from,
            signalData,
          });
        });

        peerRef.current.on('stream', (remoteStream: MediaStream) => {
          onRemoteStream(remoteStream);
        });

        peerRef.current.signal(data.signal);
        onCallStateChange(true);
        return stream;
      } catch (error) {
        Logger.error('Failed to get local stream:', error);
        throw new Error('Failed to access camera/microphone');
      }
    },
    [socket, onCallStateChange]
  );

  const declineCall = useCallback(
    (callId: string) => {
      if (!socket) {
        throw new Error('Socket connection not available');
      }
      socket.emit('declineCall', { callId });
    },
    [socket]
  );

  const endCall = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      onLocalStream(null);
      onRemoteStream(null);
    }

    onCallStateChange(false);
  }, [onCallStateChange, onLocalStream, onRemoteStream]);

  const handleIncomingSignal = useCallback((signal: any) => {
    if (peerRef.current) {
      peerRef.current.signal(signal);
    }
  }, []);

  return {
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    handleIncomingSignal,
    peerRef,
  };
};
