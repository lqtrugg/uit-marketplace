import { EntitySchema } from 'typeorm';

export const ConversationEntity = new EntitySchema({
  name: 'Conversation',
  tableName: 'conversations',
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    chatId: {
      type: Number,
      nullable: false,
      unique: true,
      name: 'chat_id'
    },
    title: {
      type: String,
      nullable: true
    },
    lastMessageAt: {
      type: 'timestamptz',
      nullable: true,
      name: 'last_message_at'
    },
    createdAt: {
      type: 'timestamptz',
      createDate: true,
      name: 'created_at'
    },
    updatedAt: {
      type: 'timestamptz',
      updateDate: true,
      name: 'updated_at'
    }
  },
  relations: {
    chat: {
      type: 'one-to-one',
      target: 'Chat',
      joinColumn: {
        name: 'chat_id',
        referencedColumnName: 'id'
      },
      onDelete: 'CASCADE'
    }
  },
  indices: [
    {
      name: 'IDX_conversation_chat_id',
      columns: ['chatId']
    },
    {
      name: 'IDX_conversation_last_message_at',
      columns: ['lastMessageAt']
    }
  ]
});
