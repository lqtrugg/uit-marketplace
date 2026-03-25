import { EntitySchema } from 'typeorm';

export const ItemFavoriteEntity = new EntitySchema({
  name: 'ItemFavorite',
  tableName: 'item_favorites',
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
    userGoogleId: {
      type: String,
      nullable: false,
      name: 'user_google_id'
    },
    createdAt: {
      type: 'timestamptz',
      createDate: true,
      name: 'created_at'
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
    },
    user: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'user_google_id',
        referencedColumnName: 'googleId'
      },
      onDelete: 'CASCADE'
    }
  },
  indices: [
    {
      name: 'UQ_item_favorites_item_user',
      columns: ['itemId', 'userGoogleId'],
      unique: true
    },
    {
      name: 'IDX_item_favorites_user_google_id',
      columns: ['userGoogleId']
    },
    {
      name: 'IDX_item_favorites_item_id',
      columns: ['itemId']
    }
  ]
});
