import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import io, { Socket } from 'socket.io-client'
import MessageList from '../../components/MessageList'
import ChatInput from '../../components/ChatInput'

let socket: Socket

const ChatRoom = () => {
  const router = useRouter()
  const { id: roomId } = router.query
  const { data: session, status } = useSession()
  const [messages, setMessages] = useState([])
  const [typingUsers, setTypingUsers] = useState([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && roomId) {
      socketInitializer()
    }

    return () => {
      if (socket) {
        socket.emit('leaveRoom', roomId)
        socket.disconnect()
      }
    }
  }, [status, roomId])

  const socketInitializer = async () => {
    await fetch('/api/socket')
    socket = io('', {
      path: '/api/socket',
    })

    socket.on('connect', () => {
      console.log('Connected to socket')
      socket.emit('joinRoom', roomId)
    })

    socket.on('receiveMessage', (message) => {
      setMessages((prevMessages) => [...prevMessages, message])
    })

    socket.on('userJoined', ({ userId }) => {
      // Handle user joined notification
      console.log(`User ${userId} joined the room`)
    })

    socket.on('userLeft', ({ userId }) => {
      // Handle user left notification
      console.log(`User ${userId} left the room`)
    })

    socket.on('userTyping', ({ userId, isTyping }) => {
      setTypingUsers((prevUsers) => 
        isTyping
          ? [...prevUsers, userId]
          : prevUsers.filter((id) => id !== userId)
      )
    })
  }

  const sendMessage = (message: string) => {
    if (socket) {
      const timestamp = new Date().toISOString()
      socket.emit('sendMessage', { roomId, message, timestamp })
    }
  }

  const handleTyping = (isTyping: boolean) => {
    if (socket) {
      socket.emit('typing', { roomId, isTyping })
    }
  }

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <div className="flex flex-col h-screen">
      <h1 className="text-2xl font-bold p-4">Chat Room: {roomId}</h1>
      <MessageList messages={messages} currentUserId={session.user.id} />
      {typingUsers.length > 0 && (
        <div className="text-sm text-gray-500 p-2">
          {typingUsers.length === 1
            ? 'Someone is typing...'
            : `${typingUsers.length} people are typing...`}
        </div>
      )}
      <ChatInput onSendMessage={sendMessage} onTyping={handleTyping} />
    </div>
  )
}

export default ChatRoom