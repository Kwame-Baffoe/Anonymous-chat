import React, { useEffect, useRef } from 'react';
import { Logger } from '../utils/Logger';

export interface VoiceVideoCallModalProps {
  roomId: string;
  onClose: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isVideo: boolean;
}

export const VoiceVideoCallModal: React.FC<VoiceVideoCallModalProps> = ({
  roomId,
  onClose,
  localStream,
  remoteStream,
  isVideo,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Handle local stream
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }

    // Handle remote stream
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }

    return () => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };
  }, [localStream, remoteStream]);

  const handleError = (error: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    Logger.error('Media playback error:', error.nativeEvent);
  };
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-labelledby="call-modal-title"
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 id="call-modal-title" className="text-xl font-semibold mb-4">
          {isVideo ? 'Video Call' : 'Voice Call'} in Progress
        </h2>
        
        {isVideo && (
          <div className="relative">
            {/* Remote video (main view) */}
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                onError={handleError}
              />
            </div>
            
            {/* Local video (picture-in-picture) */}
            <div className="absolute bottom-4 right-4 w-1/4 aspect-video bg-gray-800 rounded-lg overflow-hidden shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                onError={handleError}
              />
            </div>
          </div>
        )}
        
        {!isVideo && (
          <div className="flex items-center justify-center h-48 bg-gray-900 rounded-lg mb-4">
            <div className="text-white text-center">
              <div className="text-4xl mb-2">🎤</div>
              <p>Voice Call Connected</p>
            </div>
          </div>
        )}

        <div className="flex justify-center space-x-4">
          <button
            onClick={() => {
              if (localStream) {
                const audioTrack = localStream.getAudioTracks()[0];
                if (audioTrack) {
                  audioTrack.enabled = !audioTrack.enabled;
                }
              }
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
          >
            Toggle Mute
          </button>
          {isVideo && (
            <button
              onClick={() => {
                if (localStream) {
                  const videoTrack = localStream.getVideoTracks()[0];
                  if (videoTrack) {
                    videoTrack.enabled = !videoTrack.enabled;
                  }
                }
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
            >
              Toggle Video
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
          >
            End Call
          </button>
        </div>
      </div>
    </div>
  );
};
