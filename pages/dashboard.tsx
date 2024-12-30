import React, { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Swal from 'sweetalert2';
import { SocketContext, SocketProvider } from '../contexts/SocketContext';
import { User } from '../interfaces/User';
import { useRooms } from '../hooks/useRooms';
import { useMessages } from '../hooks/useMessages';
import { useOnlineUsers } from '../hooks/useOnlineUsers';
import { useSocketEvents } from '../hooks/useSocketEvents';
import { useMediaHandlers } from '../hooks/useMediaHandlers';
import { useCallHandlers } from '../hooks/useCallHandlers';
import { Layout } from '../components/Layout';
import { RoomList } from '../components/RoomList';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { OnlineUsersList } from '../components/OnlineUsersList';
import { UserProfileModal } from '../components/UserProfileModal';
import { VoiceVideoCallModal } from '../components/VoiceVideoCallModal';
import { MessageThreadModal } from '../components/MessageThreadModal';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ChatProvider, useChatContext, chatActions } from '../contexts/ChatContext';
import { chatApi } from '../utils/api';
import { Logger } from '../utils/Logger';

const DashboardContent: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const { socket, isConnected, error: socketError, reconnect } = React.useContext(SocketContext);
  const { state, dispatch } = useChatContext();

  // Custom hooks
  const {
    data: roomsData,
    fetchNextPage: fetchNextRooms,
    hasNextPage: hasMoreRooms,
    isLoading: isLoadingRooms,
  } = useRooms();

  const {
    data: messagesData,
    fetchNextPage: fetchNextMessages,
    hasNextPage: hasMoreMessages,
    isLoading: isLoadingMessages,
  } = useMessages(state.selectedRoom?._id ?? '');

  const {
    data: onlineUsers,
    isLoading: isLoadingOnlineUsers,
  } = useOnlineUsers();

  // Socket event handlers
  useSocketEvents({
    socket,
    selectedRoomId: state.selectedRoom?._id ?? null,
    onTypingUsers: (users) => dispatch(chatActions.setTypingUsers(users)),
  });

  // Media handlers
  const {
    startRecording,
    stopRecording,
    uploadAudio,
    uploadAttachment,
    handleFileSelect,
    removeAttachment,
    attachments,
  } = useMediaHandlers({
    onRecordingStateChange: (isRecording) =>
      dispatch(chatActions.setIsRecording(isRecording)),
    onAudioBlobChange: (blob) => dispatch(chatActions.setAudioBlob(blob)),
    onAttachmentsChange: (files) => dispatch(chatActions.setAttachments(files)),
  });

  // Call handlers
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = React.useState<MediaStream | null>(null);
  const [callType, setCallType] = React.useState<'audio' | 'video'>('audio');

  const {
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    handleIncomingSignal,
  } = useCallHandlers({
    socket,
    onCallStateChange: (isInCall) => {
      dispatch(chatActions.setShowVoiceVideoCall(isInCall));
      if (!isInCall) {
        setLocalStream(null);
        setRemoteStream(null);
        setCallType('audio'); // Reset call type when call ends
      }
    },
    onLocalStream: (stream) => setLocalStream(stream),
    onRemoteStream: (stream) => setRemoteStream(stream),
  });

  // Handle incoming call
  React.useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data: { from: string; type: 'audio' | 'video'; signal: any }) => {
      setCallType(data.type);
      Swal.fire({
        title: `Incoming ${data.type} Call`,
        text: 'Would you like to accept?',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Accept',
        cancelButtonText: 'Decline'
      }).then((result) => {
        if (result.isConfirmed) {
          acceptCall({ from: data.from, type: data.type, signal: data.signal });
        } else {
          declineCall(data.from);
        }
      });
    };

    socket.on('incomingCall', handleIncomingCall);
    return () => {
      socket.off('incomingCall', handleIncomingCall);
    };
  }, [socket, acceptCall, declineCall]);

  // Cleanup streams when component unmounts
  React.useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream, remoteStream]);

  // Event handlers
  const handleSendMessage = useCallback(async (content: string, attachments: File[], audioBlob: Blob | null) => {
    if (!state.selectedRoom || !session) return;

    try {
      await chatApi.sendMessage(state.selectedRoom._id, content, attachments);
    } catch (error) {
      Logger.error('Error sending message:', error);
      Swal.fire('Error', 'Failed to send message. Please try again.', 'error');
    }
  }, [state.selectedRoom, session]);

  const handleUserPresenceChange = useCallback((presence: User['presence']) => {
    dispatch(chatActions.setUserPresence(presence));
    socket?.emit('updatePresence', { presence });
  }, [socket, dispatch]);

  if (!session) return null;

  return (
    <Layout
      user={session.user}
      isConnected={isConnected}
      socketError={socketError}
      onUserProfileClick={() => dispatch(chatActions.setShowUserProfile(true))}
      onPresenceChange={handleUserPresenceChange}
    >
      <div className="flex-1 flex">
        <RoomList
          rooms={roomsData?.pages?.[0]?.results ?? []}
          selectedRoomId={state.selectedRoom?._id ?? null}
          isLoading={isLoadingRooms}
          hasMore={!!hasMoreRooms}
          onRoomSelect={(room) => dispatch(chatActions.setSelectedRoom(room))}
          onLoadMore={() => fetchNextRooms()}
        />

        <div className="flex-1 flex flex-col">
          <MessageList
            messages={messagesData?.pages?.flatMap((page) => page.results) ?? []}
            currentUser={session.user}
            roomPublicKey={state.selectedRoom?.publicKey ?? ''}
            isLoading={isLoadingMessages}
            hasMore={!!hasMoreMessages}
            searchQuery={state.messageSearchQuery}
            onLoadMore={() => fetchNextMessages()}
            onEditClick={(messageId, content) => {
              dispatch(chatActions.setEditingMessageId(messageId));
              dispatch(chatActions.setEditedMessageContent(content));
              dispatch(chatActions.setShowEditMessage(true));
            }}
            onDeleteClick={(messageId) => {
              dispatch(chatActions.setMessageToDelete(messageId));
              dispatch(chatActions.setShowDeleteConfirmation(true));
            }}
            onReactionClick={(messageId, emoji) => {
              if (!state.selectedRoom) return;
              socket?.emit('messageReaction', {
                messageId,
                emoji,
                userId: session.user.id,
                roomId: state.selectedRoom._id,
              });
            }}
            onThreadClick={(messageId) => {
              dispatch(chatActions.setSelectedThreadParentId(messageId));
              dispatch(chatActions.setThreadModalOpen(true));
            }}
          />

          <ChatInput
            onSendMessage={handleSendMessage}
            onTyping={() => {
              if (state.selectedRoom && socket) {
                socket.emit('userTyping', { roomId: state.selectedRoom._id });
              }
            }}
            onStopTyping={() => {
              if (state.selectedRoom && socket) {
                socket.emit('userStoppedTyping', { roomId: state.selectedRoom._id });
              }
            }}
          />
        </div>

        <OnlineUsersList
          users={onlineUsers ?? []}
          isLoading={isLoadingOnlineUsers}
        />
      </div>

      {/* Modals */}
      {state.showUserProfile && (
        <UserProfileModal
          user={session.user}
          onClose={() => dispatch(chatActions.setShowUserProfile(false))}
          onUpdate={async (updatedUser) => {
            try {
              await chatApi.updateUserProfile(session.user.id, updatedUser);
              Swal.fire('Success', 'Profile updated successfully', 'success');
            } catch (error) {
              Logger.error('Error updating profile:', error);
              Swal.fire('Error', 'Failed to update profile', 'error');
            }
          }}
        />
      )}

      {state.showVoiceVideoCall && (
        <VoiceVideoCallModal
          roomId={state.selectedRoom?._id ?? ''}
          onClose={() => {
            endCall();
            dispatch(chatActions.setShowVoiceVideoCall(false));
          }}
          localStream={localStream}
          remoteStream={remoteStream}
          isVideo={callType === 'video'}
        />
      )}

      {state.threadModalOpen && state.selectedThreadParentId && (
        <MessageThreadModal
          parentMessageId={state.selectedThreadParentId}
          onClose={() => dispatch(chatActions.setThreadModalOpen(false))}
          onAddReply={(content) => {
            if (!state.selectedRoom || !session) return;
            socket?.emit('addMessageToThread', {
              parentId: state.selectedThreadParentId,
              content,
              roomId: state.selectedRoom._id,
            });
          }}
        />
      )}
    </Layout>
  );
};

const DashboardPage: React.FC = () => {
  return (
    <ProtectedRoute>
      <ChatProvider>
        <DashboardContent />
      </ChatProvider>
    </ProtectedRoute>
  );
};

export default DashboardPage;
