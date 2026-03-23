import { EntitySchema } from 'typeorm';

export const DepositEntity = new EntitySchema({
  name: 'Deposit',
  tableName: 'deposits',
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    referenceId: {
      type: String,
      nullable: false,
      unique: true,
      name: 'reference_id'
    },
    buyerGoogleId: {
      type: String,
      nullable: false,
      name: 'buyer_google_id'
    },
    itemId: {
      type: Number,
      nullable: false,
      name: 'item_id'
    },
    amount: {
      type: Number,
      nullable: false
    },
    currency: {
      type: String,
      nullable: false,
      default: 'VND'
    },
    status: {
      type: String,
      nullable: false,
      default: 'pending'
    },
    expiresAt: {
      type: 'timestamptz',
      nullable: false,
      name: 'expires_at'
    },
    confirmedAt: {
      type: 'timestamptz',
      nullable: true,
      name: 'confirmed_at'
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
  indices: [
    {
      name: 'IDX_deposit_buyer_google_id',
      columns: ['buyerGoogleId']
    },
    {
      name: 'IDX_deposit_item_id',
      columns: ['itemId']
    },
    {
      name: 'IDX_deposit_created_at',
      columns: ['createdAt']
    }
  ]
});
