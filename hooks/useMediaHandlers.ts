import { useCallback, useRef, useState } from 'react';
import axios from 'axios';
import { Logger } from '../utils/Logger';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

interface UseMediaHandlersProps {
  onRecordingStateChange: (isRecording: boolean) => void;
  onAudioBlobChange: (blob: Blob | null) => void;
  onAttachmentsChange: (files: File[]) => void;
}

export const useMediaHandlers = ({
  onRecordingStateChange,
  onAudioBlobChange,
  onAttachmentsChange,
}: UseMediaHandlersProps) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: BlobPart[] = [];
      mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
      });

      mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        onAudioBlobChange(audioBlob);
      });

      mediaRecorder.start();
      onRecordingStateChange(true);
    } catch (error) {
      Logger.error('Error starting recording:', error);
      throw new Error('Failed to start recording. Please check your microphone permissions.');
    }
  }, [onRecordingStateChange, onAudioBlobChange]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      onRecordingStateChange(false);
    }
  }, [onRecordingStateChange]);

  const uploadAudio = useCallback(async (blob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('audio', blob, 'audio.webm');
    try {
      const { data } = await api.post<{ url: string }>('/upload-audio', formData);
      return data.url;
    } catch (error) {
      Logger.error('Error uploading audio:', error);
      throw new Error('Failed to upload audio');
    }
  }, []);

  const uploadAttachment = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post<{ url: string }>(
        '/upload-attachment',
        formData
      );
      return data.url;
    } catch (error) {
      Logger.error('Error uploading attachment:', error);
      throw new Error('Failed to upload attachment');
    }
  }, []);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (files) {
      const newAttachments = [...attachments, ...Array.from(files)];
      setAttachments(newAttachments);
      onAttachmentsChange(newAttachments);
    }
  }, [attachments, onAttachmentsChange]);

  const removeAttachment = useCallback((index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    setAttachments(newAttachments);
    onAttachmentsChange(newAttachments);
  }, [attachments, onAttachmentsChange]);

  return {
    startRecording,
    stopRecording,
    uploadAudio,
    uploadAttachment,
    handleFileSelect,
    removeAttachment,
    attachments,
  };
};
