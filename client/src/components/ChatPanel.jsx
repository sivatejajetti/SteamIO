import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Info, User, Smile } from 'lucide-react';
import { socket } from '../services/socket';

export default function ChatPanel({ room, currentUser, addToast }) {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [room?.chat]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    socket.emit('chat-message', { text: messageText.trim() });
    setMessageText('');
  };

  return (
    <div className="flex flex-col h-full bg-[#161619] border-l border-slate-800/80 w-full">
      {/* Chat Header */}
      <div className="h-12 border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0 bg-[#121214]">
        <div className="flex items-center gap-2 text-slate-200 font-bold text-xs uppercase tracking-wider">
          <MessageSquare className="w-4 h-4 text-netflix-red" />
          <span>Room Chat</span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          {room?.chat?.length || 0} messages
        </span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans text-xs">
        {room?.chat?.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 py-10">
            <MessageSquare className="w-8 h-8 stroke-1 text-slate-600" />
            <p className="text-xs">No messages yet. Say hello to the lounge!</p>
          </div>
        ) : (
          room?.chat?.map((msg) => {
            if (msg.isSystem) {
              return (
                <div
                  key={msg.id}
                  className="flex items-center justify-center gap-1.5 my-2 py-1 px-3 rounded-full bg-slate-800/40 text-[11px] text-slate-400 border border-slate-800/50 text-center mx-auto max-w-[90%]"
                >
                  <Info className="w-3 h-3 text-netflix-red shrink-0" />
                  <span>{msg.text}</span>
                </div>
              );
            }

            const isSelf = msg.username === currentUser;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} space-y-1`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className={`font-semibold ${isSelf ? 'text-netflix-red' : 'text-slate-300'}`}>
                    {msg.username}
                  </span>
                  <span>•</span>
                  <span>{formatTimestamp(msg.timestamp)}</span>
                </div>

                <div
                  className={`max-w-[85%] px-3.5 py-2 rounded-2xl leading-relaxed break-words ${
                    isSelf
                      ? 'bg-netflix-red text-white rounded-tr-none'
                      : 'bg-[#222226] text-slate-200 rounded-tl-none border border-slate-800'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800/80 bg-[#121214] shrink-0">
        <div className="relative flex items-center">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="w-full pl-3.5 pr-10 py-2.5 bg-black/50 border border-slate-800 focus:border-netflix-red rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!messageText.trim()}
            className="absolute right-1.5 p-1.5 bg-netflix-red hover:bg-netflix-darkRed disabled:opacity-30 text-white rounded-lg transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
