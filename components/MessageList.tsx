import React, { useRef, useEffect } from 'react';
import { Message } from '../interfaces/Message';
import { User } from '../interfaces/User';
import { MessageItem } from './MessageItem';
import Spinner from './Spinner';
import { AnimatePresence } from 'framer-motion';
import { messageHelpers } from '../utils/messageHelpers';

interface MessageListProps {
  messages: Message[];
  currentUser: User;
  roomPublicKey: string;
  isLoading: boolean;
  hasMore: boolean;
  searchQuery: string;
  onLoadMore: () => void;
  onEditClick: (messageId: string, content: string) => void;
  onDeleteClick: (messageId: string) => void;
  onReactionClick: (messageId: string, emoji: string) => void;
  onThreadClick: (messageId: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUser,
  roomPublicKey,
  isLoading,
  hasMore,
  searchQuery,
  onLoadMore,
  onEditClick,
  onDeleteClick,
  onReactionClick,
  onThreadClick,
}) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Setup intersection observer for infinite scrolling
  useEffect(() => {
    if (isLoading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          onLoadMore();
        }
      },
      { threshold: 0.5 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoading, hasMore, onLoadMore]);

  // Group messages by date
  const groupedMessages = messageHelpers.groupMessagesByDate(messages);

  return (
    <div className="flex-1 overflow-y-auto p-4" role="log" aria-live="polite">
      {isLoading && messages.length === 0 ? (
        <div className="flex justify-center items-center h-full">
          <Spinner />
        </div>
      ) : (
        <>
          <AnimatePresence>
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center my-4">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <div className="mx-4 text-sm text-gray-500">{date}</div>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>

                {/* Messages for this date */}
                {dateMessages
                  .filter((msg) => {
                    if (!searchQuery) return true;
                    // Filter messages based on search query
                    return (
                      msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      msg.username.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                  })
                  .map((message) => (
                    <MessageItem
                      key={message._id}
                      message={message}
                      currentUser={currentUser}
                      roomPublicKey={roomPublicKey}
                      onEditClick={onEditClick}
                      onDeleteClick={onDeleteClick}
                      onReactionClick={onReactionClick}
                      onThreadClick={onThreadClick}
                    />
                  ))}
              </div>
            ))}
          </AnimatePresence>

          {/* Load more trigger */}
          {hasMore && (
            <div
              ref={loadMoreRef}
              className="flex justify-center items-center py-4"
            >
              {isLoading ? (
                <Spinner />
              ) : (
                <button
                  onClick={onLoadMore}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  Load More Messages
                </button>
              )}
            </div>
          )}

          {/* No messages state */}
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="text-xl mb-2">No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          )}

          {/* No results state */}
          {messages.length > 0 &&
            searchQuery &&
            Object.values(groupedMessages).every((group) =>
              group.every(
                (msg) =>
                  !msg.content
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) &&
                  !msg.username.toLowerCase().includes(searchQuery.toLowerCase())
              )
            ) && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p className="text-xl mb-2">No messages found</p>
                <p className="text-sm">
                  Try different keywords or clear the search
                </p>
              </div>
            )}
        </>
      )}
    </div>
  );
};
