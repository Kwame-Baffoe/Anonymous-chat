import React, { memo, useEffect, useState } from 'react';
import { Message } from '../interfaces/Message';
import { messageHelpers } from '../utils/messageHelpers';
import { User } from '../interfaces/User';
import { Edit, Trash2, MessageSquare, Paperclip } from 'react-feather';
import { motion } from 'framer-motion';

interface MessageItemProps {
  message: Message;
  currentUser: User;
  roomPublicKey: string;
  onEditClick: (messageId: string, content: string) => void;
  onDeleteClick: (messageId: string) => void;
  onReactionClick: (messageId: string, emoji: string) => void;
  onThreadClick: (messageId: string) => void;
}

export const MessageItem = memo(({
  message,
  currentUser,
  roomPublicKey,
  onEditClick,
  onDeleteClick,
  onReactionClick,
  onThreadClick,
}: MessageItemProps) => {
  const isOwnMessage = message.userId === currentUser._id;
  const [decryptedContent, setDecryptedContent] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    const decryptMessage = async () => {
      try {
        const content = await messageHelpers.decryptMessage(
          message.content,
          roomPublicKey,
          currentUser.privateKey
        );
        if (mounted) {
          setDecryptedContent(content);
        }
      } catch (error) {
        if (mounted) {
          setDecryptedContent('[Unable to decrypt message]');
        }
      }
    };

    decryptMessage();

    return () => {
      mounted = false;
    };
  }, [message.content, roomPublicKey, currentUser.privateKey]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`mb-4 ${isOwnMessage ? 'text-right' : 'text-left'}`}
      aria-label={`Message from ${message.username}`}
    >
      <div
        className={`inline-block p-3 rounded-lg ${
          isOwnMessage
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-200 text-gray-800'
        }`}
      >
        <p className="font-medium">{message.username}</p>
        <div className="message-content">
          {messageHelpers.hasCodeBlock(decryptedContent) ? (
            // Render code blocks if present
            messageHelpers.extractCodeBlocks(decryptedContent).map((block, index) => (
              <pre key={index} className="bg-gray-800 text-white p-2 rounded mt-2">
                <code className={`language-${block.language}`}>{block.code}</code>
              </pre>
            ))
          ) : (
            // Render regular message content
            <p>{messageHelpers.formatMessageContent(decryptedContent)}</p>
          )}
        </div>

        {/* Attachments */}
        {message.attachments?.map((attachment, index) => (
          <a
            key={index}
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-2 text-sm underline"
            aria-label={`Attachment: ${attachment.filename}`}
          >
            <Paperclip size={14} className="inline mr-1" aria-hidden="true" />
            {attachment.filename}
          </a>
        ))}

        {/* Timestamp and edit indicator */}
        <p className="text-xs mt-1 opacity-70">
          {messageHelpers.formatTimestamp(message.createdAt)}
          {message.isEdited && ' (edited)'}
        </p>

        {/* Message reactions */}
        <div className="mt-2 flex justify-end space-x-2">
          {Object.entries(message.reactions).map(([emoji, users]) => (
            <span
              key={emoji}
              className={`text-sm rounded-full px-2 py-1 ${
                isOwnMessage ? 'bg-indigo-700' : 'bg-gray-300'
              }`}
            >
              {emoji} {users.length}
            </span>
          ))}
          <button
            onClick={() => onReactionClick(message._id, '👍')}
            className="text-sm"
            aria-label="React with thumbs up"
          >
            👍
          </button>
          <button
            onClick={() => onReactionClick(message._id, '❤️')}
            className="text-sm"
            aria-label="React with heart"
          >
            ❤️
          </button>
          <button
            onClick={() => onReactionClick(message._id, '😂')}
            className="text-sm"
            aria-label="React with laughing face"
          >
            😂
          </button>
        </div>

        {/* Message actions */}
        {isOwnMessage && (
          <div className="mt-1 space-x-2">
            <button
              onClick={() => onEditClick(message._id, decryptedContent)}
              className="text-xs text-blue-500 hover:underline"
              aria-label="Edit message"
            >
              <Edit size={14} className="inline mr-1" aria-hidden="true" />
              Edit
            </button>
            <button
              onClick={() => onDeleteClick(message._id)}
              className="text-xs text-red-500 hover:underline"
              aria-label="Delete message"
            >
              <Trash2 size={14} className="inline mr-1" aria-hidden="true" />
              Delete
            </button>
          </div>
        )}

        {/* Thread button */}
        <button
          onClick={() => onThreadClick(message._id)}
          className="text-xs text-gray-500 hover:underline mt-1"
          aria-label={
            message.thread && message.thread.length > 0
              ? `View Thread (${message.thread.length} replies)`
              : 'Reply in Thread'
          }
        >
          <MessageSquare size={14} className="inline mr-1" aria-hidden="true" />
          {message.thread && message.thread.length > 0
            ? `View Thread (${message.thread.length})`
            : 'Reply in Thread'}
        </button>

        {/* Message status indicator */}
        <div className="text-xs mt-1 opacity-70">
          {messageHelpers.getMessageStatus(message)}
        </div>
      </div>
    </motion.div>
  );
});

MessageItem.displayName = 'MessageItem';
