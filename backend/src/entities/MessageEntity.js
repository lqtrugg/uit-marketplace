import { EntitySchema } from 'typeorm';

export const MessageEntity = new EntitySchema({
  name: 'Message',
  tableName: 'messages',
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    conversationId: {
      type: Number,
      nullable: false,
      name: 'conversation_id'
    },
    senderGoogleId: {
      type: String,
      nullable: false,
      name: 'sender_google_id'
    },
    content: {
      type: 'text',
      nullable: false
    },
    messageType: {
      type: String,
      nullable: false,
      default: 'text',
      name: 'message_type'
    },
    sentAt: {
      type: 'timestamptz',
      createDate: true,
      name: 'sent_at'
    },
    editedAt: {
      type: 'timestamptz',
      nullable: true,
      name: 'edited_at'
    },
    readAt: {
      type: 'timestamptz',
      nullable: true,
      name: 'read_at'
    }
  },
  relations: {
    conversation: {
      type: 'many-to-one',
      target: 'Conversation',
      joinColumn: {
        name: 'conversation_id',
        referencedColumnName: 'id'
      },
      onDelete: 'CASCADE'
    },
    sender: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'sender_google_id',
        referencedColumnName: 'googleId'
      },
      onDelete: 'CASCADE'
    }
  },
  checks: [
    {
      name: 'CHK_message_type_valid',
      expression: `"message_type" IN ('text','image','video','offer','system')`
    },
    {
      name: 'CHK_message_content_not_blank',
      expression: `char_length(trim("content")) > 0`
    }
  ],
  indices: [
    {
      name: 'IDX_message_conversation_id',
      columns: ['conversationId']
    },
    {
      name: 'IDX_message_sender_google_id',
      columns: ['senderGoogleId']
    },
    {
      name: 'IDX_message_sent_at',
      columns: ['sentAt']
    }
  ]
});
