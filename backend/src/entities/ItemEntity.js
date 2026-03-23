import { EntitySchema } from 'typeorm';

export const ItemEntity = new EntitySchema({
  name: 'Item',
  tableName: 'items',
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    sellerGoogleId: {
      type: String,
      nullable: false,
      name: 'seller_google_id'
    },
    sellerName: {
      type: String,
      nullable: false,
      name: 'seller_name'
    },
    sellerEmail: {
      type: String,
      nullable: false,
      name: 'seller_email'
    },
    itemName: {
      type: String,
      nullable: false,
      name: 'item_name'
    },
    description: {
      type: 'text',
      nullable: false
    },
    availabilityDuration: {
      type: String,
      nullable: true,
      name: 'availability_duration'
    },
    durationDays: {
      type: Number,
      nullable: false,
      default: 0,
      name: 'duration_days'
    },
    durationHours: {
      type: Number,
      nullable: false,
      default: 0,
      name: 'duration_hours'
    },
    location: {
      type: String,
      nullable: false
    },
    wardCode: {
      type: Number,
      nullable: true,
      name: 'ward_code'
    },
    reasonForSelling: {
      type: 'text',
      nullable: false,
      name: 'reason_for_selling'
    },
    price: {
      type: String,
      nullable: false
    },
    zipCode: {
      type: String,
      nullable: true,
      name: 'zip_code'
    },
    negotiable: {
      type: String,
      nullable: false
    },
    conditionLabel: {
      type: String,
      nullable: false,
      name: 'condition_label'
    },
    delivery: {
      type: String,
      nullable: false,
      name: 'self_pickup'
    },
    listingStatus: {
      type: String,
      nullable: false,
      default: 'active',
      name: 'listing_status'
    },
    reservedByGoogleId: {
      type: String,
      nullable: true,
      name: 'reserved_by_google_id'
    },
    reservedAt: {
      type: 'timestamptz',
      nullable: true,
      name: 'reserved_at'
    },
    soldToGoogleId: {
      type: String,
      nullable: true,
      name: 'sold_to_google_id'
    },
    soldAt: {
      type: 'timestamptz',
      nullable: true,
      name: 'sold_at'
    },
    postToMarketplace: {
      type: Boolean,
      nullable: false,
      default: false,
      name: 'post_to_marketplace'
    },
    imageUrls: {
      type: 'jsonb',
      nullable: false,
      default: () => "'[]'",
      name: 'image_urls'
    },
    videoUrls: {
      type: 'jsonb',
      nullable: false,
      default: () => "'[]'",
      name: 'video_urls'
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
      name: 'IDX_item_created_at',
      columns: ['createdAt']
    },
    {
      name: 'IDX_item_seller_google_id',
      columns: ['sellerGoogleId']
    },
    {
      name: 'IDX_item_listing_status',
      columns: ['listingStatus']
    }
  ]
});
