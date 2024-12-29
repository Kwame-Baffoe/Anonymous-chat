import React, { useCallback } from 'react';
import { Mic, Smile, Paperclip, Send } from 'react-feather';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useMediaHandlers } from '../hooks/useMediaHandlers';
import { useChatContext } from '../contexts/ChatContext';
import { chatActions } from '../contexts/ChatContext';
import { debounce } from 'lodash';

interface ChatInputProps {
  onSendMessage: (content: string, attachments: File[], audioBlob: Blob | null) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onTyping,
  onStopTyping,
  disabled = false,
}) => {
  const { state, dispatch } = useChatContext();
  const {
    startRecording,
    stopRecording,
    handleFileSelect,
    removeAttachment,
    attachments,
  } = useMediaHandlers({
    onRecordingStateChange: (isRecording) =>
      dispatch(chatActions.setIsRecording(isRecording)),
    onAudioBlobChange: (blob) => dispatch(chatActions.setAudioBlob(blob)),
    onAttachmentsChange: (files) => dispatch(chatActions.setAttachments(files)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (!state.message.trim() && !state.audioBlob && attachments.length === 0) ||
      disabled
    )
      return;

    onSendMessage(state.message, attachments, state.audioBlob);
    dispatch(chatActions.setMessage(''));
    dispatch(chatActions.setAudioBlob(null));
    dispatch(chatActions.setAttachments([]));
    dispatch(chatActions.setShowEmojiPicker(false));
  };

  const handleTyping = useCallback(
    debounce(() => {
      onTyping();
    }, 300),
    [onTyping]
  );

  const handleStopTyping = useCallback(
    debounce(() => {
      onStopTyping();
    }, 1000),
    [onStopTyping]
  );

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    dispatch(chatActions.setMessage(state.message + emojiData.emoji));
    dispatch(chatActions.setShowEmojiPicker(false));
  };

  return (
    <div className="bg-white p-4 border-t border-gray-200">
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label="Attached files">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center bg-gray-100 rounded p-1"
              >
                <span className="text-sm truncate max-w-xs">{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="ml-2 text-red-500 hover:text-red-700"
                  aria-label={`Remove ${file.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={state.message}
            onChange={(e) => {
              dispatch(chatActions.setMessage(e.target.value));
              handleTyping();
            }}
            onBlur={handleStopTyping}
            placeholder="Type your message..."
            className="flex-grow px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={disabled}
            aria-label="Message input"
          />

          {/* Voice recording button */}
          <button
            type="button"
            onClick={state.isRecording ? stopRecording : startRecording}
            className={`p-2 rounded-full ${
              state.isRecording
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-600'
            } hover:opacity-80`}
            disabled={disabled}
            aria-label={state.isRecording ? 'Stop recording' : 'Start recording'}
          >
            <Mic size={20} aria-hidden="true" />
          </button>

          {/* Emoji picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                dispatch(
                  chatActions.setShowEmojiPicker(!state.showEmojiPicker)
                )
              }
              className="p-2 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300"
              disabled={disabled}
              aria-label="Open emoji picker"
            >
              <Smile size={20} aria-hidden="true" />
            </button>
            {state.showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2">
                <EmojiPicker onEmojiClick={handleEmojiClick} />
              </div>
            )}
          </div>

          {/* File attachment */}
          <label className="p-2 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 cursor-pointer">
            <Paperclip size={20} aria-hidden="true" />
            <input
              type="file"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              disabled={disabled}
              aria-label="Attach files"
            />
          </label>

          {/* Send button */}
          <button
            type="submit"
            className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50"
            disabled={
              disabled ||
              (!state.message.trim() &&
                !state.audioBlob &&
                attachments.length === 0)
            }
            aria-label="Send message"
          >
            <Send size={20} aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
};
