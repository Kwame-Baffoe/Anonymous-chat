import React, { useRef, useEffect } from 'react';

interface VoiceVideoCallModalProps {
  roomId: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const VoiceVideoCallModal: React.FC<VoiceVideoCallModalProps> = ({ roomId, onClose, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div ref={modalRef} className="bg-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Call in Room: {roomId}</h2>
        {children}
      </div>
    </div>
  );
};