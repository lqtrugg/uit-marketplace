import { EntitySchema } from 'typeorm';

export const OfferEntity = new EntitySchema({
  name: 'Offer',
  tableName: 'offers',
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    itemId: {
      type: Number,
      nullable: false,
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
    offeredPrice: {
      type: Number,
      nullable: false,
      name: 'offered_price'
    },
    status: {
      type: String,
      nullable: false,
      default: 'pending'
    },
    message: {
      type: 'text',
      nullable: true
    },
    expiresAt: {
      type: 'timestamptz',
      nullable: true,
      name: 'expires_at'
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
      name: 'CHK_offer_price_positive',
      expression: '"offered_price" > 0'
    },
    {
      name: 'CHK_offer_status_valid',
      expression: `"status" IN ('pending','accepted','rejected','expired','cancelled','countered')`
    },
    {
      name: 'CHK_offer_buyer_not_seller',
      expression: '"buyer_google_id" <> "seller_google_id"'
    }
  ],
  indices: [
    {
      name: 'IDX_offer_item_id',
      columns: ['itemId']
    },
    {
      name: 'IDX_offer_buyer_google_id',
      columns: ['buyerGoogleId']
    },
    {
      name: 'IDX_offer_seller_google_id',
      columns: ['sellerGoogleId']
    },
    {
      name: 'IDX_offer_status',
      columns: ['status']
    },
    {
      name: 'IDX_offer_item_status_created_at',
      columns: ['itemId', 'status', 'createdAt']
    }
  ]
});
