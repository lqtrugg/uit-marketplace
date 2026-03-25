import { EntitySchema } from 'typeorm';

export const ItemMediaEntity = new EntitySchema({
  name: 'ItemMedia',
  tableName: 'item_media',
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
    mediaType: {
      type: String,
      nullable: false,
      default: 'image',
      name: 'media_type'
    },
    url: {
      type: 'text',
      nullable: false
    },
    thumbnailUrl: {
      type: 'text',
      nullable: true,
      name: 'thumbnail_url'
    },
    sortOrder: {
      type: Number,
      nullable: false,
      default: 0,
      name: 'sort_order'
    },
    isPrimary: {
      type: Boolean,
      nullable: false,
      default: false,
      name: 'is_primary'
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
      name: 'CHK_item_media_type_valid',
      expression: `"media_type" IN ('image','video')`
    },
    {
      name: 'CHK_item_media_sort_order_non_negative',
      expression: '"sort_order" >= 0'
    }
  ],
  indices: [
    {
      name: 'IDX_item_media_item_id',
      columns: ['itemId']
    },
    {
      name: 'IDX_item_media_media_type',
      columns: ['mediaType']
    },
    {
      name: 'IDX_item_media_sort_order',
      columns: ['sortOrder']
    },
    {
      name: 'UQ_item_media_item_url',
      columns: ['itemId', 'url'],
      unique: true
    },
    {
      name: 'UQ_item_media_item_sort_order',
      columns: ['itemId', 'sortOrder'],
      unique: true
    }
  ]
});
