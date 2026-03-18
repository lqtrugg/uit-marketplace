import { EntitySchema } from 'typeorm';

export const UserEntity = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    googleId: {
      type: String,
      primary: true,
      name: 'google_id'
    },
    email: {
      type: String,
      unique: true,
      nullable: false
    },
    name: {
      type: String,
      nullable: false
    },
    picture: {
      type: String,
      nullable: false,
      default: ''
    },
    createdAt: {
      type: 'timestamptz',
      createDate: true,
      name: 'created_at'
    },
    lastLoginAt: {
      type: 'timestamptz',
      default: () => 'CURRENT_TIMESTAMP',
      name: 'last_login_at'
    }
  }
});
