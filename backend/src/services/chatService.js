import { getDataSource } from '../core/dataSource.js';
import { ChatEntity } from '../entities/ChatEntity.js';
import { ConversationEntity } from '../entities/ConversationEntity.js';
import { MessageEntity } from '../entities/MessageEntity.js';
import { UserEntity } from '../entities/UserEntity.js';

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function sortPair(leftGoogleId, rightGoogleId) {
  const left = normalizeText(leftGoogleId);
  const right = normalizeText(rightGoogleId);

  if (!left || !right || left === right) {
    return null;
  }

  return left < right ? [left, right] : [right, left];
}

function normalizeChat(chat, meGoogleId, peerUser = null, conversation = null, lastMessage = null) {
  const myGoogleId = normalizeText(meGoogleId);
  const participantIds = [chat.buyerGoogleId, chat.sellerGoogleId].filter(Boolean);
  const peerGoogleId = participantIds.find((id) => id !== myGoogleId) || null;

  return {
    id: chat.id,
    status: chat.status || 'active',
    itemId: chat.itemId || null,
    buyerGoogleId: chat.buyerGoogleId,
    sellerGoogleId: chat.sellerGoogleId,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    peer: peerGoogleId
      ? {
          googleId: peerGoogleId,
          name: peerUser?.name || peerGoogleId,
          email: peerUser?.email || '',
          picture: peerUser?.picture || ''
        }
      : null,
    conversation: conversation
      ? {
          id: conversation.id,
          title: conversation.title || '',
          lastMessageAt: conversation.lastMessageAt || null
        }
      : null,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          senderGoogleId: lastMessage.senderGoogleId,
          content: lastMessage.content,
          messageType: lastMessage.messageType || 'text',
          sentAt: lastMessage.sentAt
        }
      : null
  };
}

function normalizeMessage(message) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderGoogleId: message.senderGoogleId,
    content: message.content,
    messageType: message.messageType || 'text',
    sentAt: message.sentAt,
    editedAt: message.editedAt || null,
    readAt: message.readAt || null
  };
}

async function getChatRepos() {
  const dataSource = await getDataSource();

  return {
    dataSource,
    chatRepo: dataSource.getRepository(ChatEntity),
    conversationRepo: dataSource.getRepository(ConversationEntity),
    messageRepo: dataSource.getRepository(MessageEntity),
    userRepo: dataSource.getRepository(UserEntity)
  };
}

export async function getOrCreateDirectChat({ meGoogleId, peerGoogleId }) {
  const pair = sortPair(meGoogleId, peerGoogleId);

  if (!pair) {
    return { ok: false, reason: 'invalid_peer', chat: null, conversation: null };
  }

  const [buyerGoogleId, sellerGoogleId] = pair;
  const { dataSource } = await getChatRepos();

  return dataSource.transaction(async (manager) => {
    const chatRepo = manager.getRepository(ChatEntity);
    const conversationRepo = manager.getRepository(ConversationEntity);
    const userRepo = manager.getRepository(UserEntity);

    const peer = await userRepo.findOneBy({ googleId: normalizeText(peerGoogleId) });

    if (!peer) {
      return { ok: false, reason: 'peer_not_found', chat: null, conversation: null };
    }

    let chat = await chatRepo.findOneBy({
      buyerGoogleId,
      sellerGoogleId
    });

    if (!chat) {
      chat = chatRepo.create({
        itemId: null,
        buyerGoogleId,
        sellerGoogleId,
        status: 'active'
      });
      chat = await chatRepo.save(chat);
    }

    let conversation = await conversationRepo.findOneBy({ chatId: chat.id });

    if (!conversation) {
      conversation = conversationRepo.create({
        chatId: chat.id,
        title: '',
        lastMessageAt: null
      });
      conversation = await conversationRepo.save(conversation);
    }

    return {
      ok: true,
      reason: '',
      chat: normalizeChat(chat, meGoogleId, peer, conversation, null),
      conversation: {
        id: conversation.id,
        chatId: conversation.chatId
      }
    };
  });
}

export async function listMyChats({ meGoogleId, limit = 50 }) {
  const normalizedMeGoogleId = normalizeText(meGoogleId);

  if (!normalizedMeGoogleId) {
    return [];
  }

  const parsedLimit = parsePositiveInteger(limit) || 50;
  const safeLimit = Math.min(parsedLimit, 200);
  const { chatRepo, conversationRepo, messageRepo, userRepo } = await getChatRepos();

  const chats = await chatRepo
    .createQueryBuilder('chat')
    .where('chat.buyerGoogleId = :googleId OR chat.sellerGoogleId = :googleId', {
      googleId: normalizedMeGoogleId
    })
    .orderBy('chat.updatedAt', 'DESC')
    .take(safeLimit)
    .getMany();

  if (!chats.length) {
    return [];
  }

  const chatIds = chats.map((chat) => chat.id);
  const peerIds = Array.from(
    new Set(
      chats
        .map((chat) => [chat.buyerGoogleId, chat.sellerGoogleId])
        .flat()
        .filter((id) => id && id !== normalizedMeGoogleId)
    )
  );

  const [conversations, peers] = await Promise.all([
    conversationRepo
      .createQueryBuilder('conversation')
      .where('conversation.chatId IN (:...chatIds)', { chatIds })
      .getMany(),
    peerIds.length
      ? userRepo
          .createQueryBuilder('user')
          .where('user.googleId IN (:...peerIds)', { peerIds })
          .getMany()
      : Promise.resolve([])
  ]);

  const conversationMap = new Map(conversations.map((conversation) => [conversation.chatId, conversation]));
  const peerMap = new Map(peers.map((peer) => [peer.googleId, peer]));

  const conversationIds = conversations.map((conversation) => conversation.id);
  const lastMessages = conversationIds.length
    ? await messageRepo
        .createQueryBuilder('message')
        .where('message.conversationId IN (:...conversationIds)', { conversationIds })
        .orderBy('message.sentAt', 'DESC')
        .getMany()
    : [];

  const lastMessageByConversationId = new Map();

  for (const message of lastMessages) {
    if (!lastMessageByConversationId.has(message.conversationId)) {
      lastMessageByConversationId.set(message.conversationId, message);
    }
  }

  return chats.map((chat) => {
    const peerGoogleId =
      chat.buyerGoogleId === normalizedMeGoogleId ? chat.sellerGoogleId : chat.buyerGoogleId;
    const conversation = conversationMap.get(chat.id) || null;
    const lastMessage =
      conversation && lastMessageByConversationId.has(conversation.id)
        ? lastMessageByConversationId.get(conversation.id)
        : null;

    return normalizeChat(chat, normalizedMeGoogleId, peerMap.get(peerGoogleId) || null, conversation, lastMessage);
  });
}

export async function listChatMessages({ chatId, meGoogleId, limit = 100 }) {
  const normalizedChatId = parsePositiveInteger(chatId);
  const normalizedMeGoogleId = normalizeText(meGoogleId);
  const parsedLimit = parsePositiveInteger(limit) || 100;
  const safeLimit = Math.min(parsedLimit, 300);

  if (!normalizedChatId || !normalizedMeGoogleId) {
    return { ok: false, reason: 'invalid_input', messages: [], chat: null };
  }

  const { chatRepo, conversationRepo, messageRepo } = await getChatRepos();
  const chat = await chatRepo.findOneBy({ id: normalizedChatId });

  if (!chat) {
    return { ok: false, reason: 'chat_not_found', messages: [], chat: null };
  }

  if (chat.buyerGoogleId !== normalizedMeGoogleId && chat.sellerGoogleId !== normalizedMeGoogleId) {
    return { ok: false, reason: 'forbidden', messages: [], chat: null };
  }

  const conversation = await conversationRepo.findOneBy({ chatId: chat.id });

  if (!conversation) {
    return { ok: true, reason: '', messages: [], chat: normalizeChat(chat, normalizedMeGoogleId) };
  }

  const rows = await messageRepo
    .createQueryBuilder('message')
    .where('message.conversationId = :conversationId', {
      conversationId: conversation.id
    })
    .orderBy('message.sentAt', 'DESC')
    .take(safeLimit)
    .getMany();

  return {
    ok: true,
    reason: '',
    messages: rows.reverse().map(normalizeMessage),
    chat: normalizeChat(chat, normalizedMeGoogleId, null, conversation)
  };
}

export async function sendChatMessage({ chatId, meGoogleId, content }) {
  const normalizedChatId = parsePositiveInteger(chatId);
  const normalizedMeGoogleId = normalizeText(meGoogleId);
  const normalizedContent = normalizeText(content);

  if (!normalizedChatId || !normalizedMeGoogleId) {
    return { ok: false, reason: 'invalid_input', message: null };
  }

  if (!normalizedContent) {
    return { ok: false, reason: 'empty_message', message: null };
  }

  const { dataSource } = await getChatRepos();

  return dataSource.transaction(async (manager) => {
    const chatRepo = manager.getRepository(ChatEntity);
    const conversationRepo = manager.getRepository(ConversationEntity);
    const messageRepo = manager.getRepository(MessageEntity);
    const userRepo = manager.getRepository(UserEntity);
    const chat = await chatRepo.findOneBy({ id: normalizedChatId });

    if (!chat) {
      return { ok: false, reason: 'chat_not_found', message: null };
    }

    if (chat.buyerGoogleId !== normalizedMeGoogleId && chat.sellerGoogleId !== normalizedMeGoogleId) {
      return { ok: false, reason: 'forbidden', message: null };
    }

    const sender = await userRepo.findOneBy({ googleId: normalizedMeGoogleId });

    if (!sender) {
      return { ok: false, reason: 'sender_not_found', message: null };
    }

    let conversation = await conversationRepo.findOneBy({ chatId: chat.id });

    if (!conversation) {
      conversation = conversationRepo.create({
        chatId: chat.id,
        title: '',
        lastMessageAt: null
      });
      conversation = await conversationRepo.save(conversation);
    }

    const created = messageRepo.create({
      conversationId: conversation.id,
      senderGoogleId: normalizedMeGoogleId,
      content: normalizedContent,
      messageType: 'text'
    });

    const saved = await messageRepo.save(created);
    conversation.lastMessageAt = saved.sentAt || new Date();
    await conversationRepo.save(conversation);
    chat.updatedAt = new Date();
    await chatRepo.save(chat);

    return {
      ok: true,
      reason: '',
      message: normalizeMessage(saved)
    };
  });
}
