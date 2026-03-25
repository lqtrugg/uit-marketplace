import { Router } from 'express';
import { requireAuthenticatedUser } from '../services/authService.js';
import {
  getOrCreateDirectChat,
  listChatMessages,
  listMyChats,
  sendChatMessage
} from '../services/chatService.js';

const chatRoutes = Router();

function parseChatId(value) {
  const parsed = Number.parseInt(String(value || ''), 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

chatRoutes.get('/', async (request, response) => {
  try {
    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const chats = await listMyChats({
      meGoogleId: user.googleId,
      limit: request.query?.limit
    });

    return response.json({ chats });
  } catch (error) {
    console.error('[CHAT_LIST_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to load chats.' });
  }
});

chatRoutes.post('/direct/:googleId', async (request, response) => {
  try {
    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const result = await getOrCreateDirectChat({
      meGoogleId: user.googleId,
      peerGoogleId: request.params?.googleId
    });

    if (!result.ok && result.reason === 'invalid_peer') {
      return response.status(400).json({ error: 'Invalid peer user id.' });
    }

    if (!result.ok && result.reason === 'peer_not_found') {
      return response.status(404).json({ error: 'Target user not found.' });
    }

    return response.status(201).json({
      chat: result.chat,
      conversation: result.conversation
    });
  } catch (error) {
    console.error('[CHAT_DIRECT_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to open direct chat.' });
  }
});

chatRoutes.get('/:chatId/messages', async (request, response) => {
  try {
    const chatId = parseChatId(request.params?.chatId);

    if (!chatId) {
      return response.status(400).json({ error: 'Invalid chat id.' });
    }

    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const result = await listChatMessages({
      chatId,
      meGoogleId: user.googleId,
      limit: request.query?.limit
    });

    if (!result.ok && result.reason === 'chat_not_found') {
      return response.status(404).json({ error: 'Chat not found.' });
    }

    if (!result.ok && result.reason === 'forbidden') {
      return response.status(403).json({ error: 'You cannot access this chat.' });
    }

    return response.json({
      chat: result.chat,
      messages: result.messages
    });
  } catch (error) {
    console.error('[CHAT_MESSAGES_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to load messages.' });
  }
});

chatRoutes.post('/:chatId/messages', async (request, response) => {
  try {
    const chatId = parseChatId(request.params?.chatId);

    if (!chatId) {
      return response.status(400).json({ error: 'Invalid chat id.' });
    }

    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const result = await sendChatMessage({
      chatId,
      meGoogleId: user.googleId,
      content: request.body?.content
    });

    if (!result.ok && result.reason === 'empty_message') {
      return response.status(400).json({ error: 'Message cannot be empty.' });
    }

    if (!result.ok && result.reason === 'chat_not_found') {
      return response.status(404).json({ error: 'Chat not found.' });
    }

    if (!result.ok && result.reason === 'forbidden') {
      return response.status(403).json({ error: 'You cannot send message to this chat.' });
    }

    if (!result.ok && result.reason === 'sender_not_found') {
      return response.status(404).json({ error: 'Sender user not found.' });
    }

    return response.status(201).json({ message: result.message });
  } catch (error) {
    console.error('[CHAT_SEND_MESSAGE_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to send message.' });
  }
});

export default chatRoutes;
