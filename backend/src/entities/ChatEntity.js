import { EntitySchema } from 'typeorm';

export const ChatEntity = new EntitySchema({
  name: 'Chat',
  tableName: 'chats',
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    itemId: {
      type: Number,
      nullable: true,
      name: 'item_id'
    },
    buyerGoogleId: {
      type: String,
      nullable: false,
      name: 'buyer_google_id'
    },
    sellerGoogleId: {
      type: String,
      nullable: false,
      name: 'seller_google_id'
    },
    status: {
      type: String,
      nullable: false,
      default: 'active'
    },
    closedAt: {
      type: 'timestamptz',
      nullable: true,
      name: 'closed_at'
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
    item: {
      type: 'many-to-one',
      target: 'Item',
      joinColumn: {
        name: 'item_id',
        referencedColumnName: 'id'
      },
      onDelete: 'CASCADE'
    }
  },
  checks: [
    {
      name: 'CHK_chat_status_valid',
      expression: `"status" IN ('active','closed','archived')`
    },
    {
      name: 'CHK_chat_buyer_not_seller',
      expression: '"buyer_google_id" <> "seller_google_id"'
    }
  ],
  indices: [
    {
      name: 'IDX_chat_item_id',
      columns: ['itemId']
    },
    {
      name: 'IDX_chat_buyer_google_id',
      columns: ['buyerGoogleId']
    },
    {
      name: 'IDX_chat_seller_google_id',
      columns: ['sellerGoogleId']
    },
    {
      name: 'IDX_chat_status',
      columns: ['status']
    },
    {
      name: 'IDX_chat_item_buyer_seller',
      columns: ['itemId', 'buyerGoogleId', 'sellerGoogleId']
    }
  ]
});
