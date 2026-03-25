import { EntitySchema } from 'typeorm';

export const SessionEntity = new EntitySchema({
  name: 'Session',
  tableName: 'sessions',
  columns: {
    id: {
      type: String,
      primary: true
    },
    userGoogleId: {
      type: String,
      nullable: false,
      name: 'user_google_id'
    },
    expiresAt: {
      type: 'timestamptz',
      nullable: false,
      name: 'expires_at'
    },
    createdAt: {
      type: 'timestamptz',
      createDate: true,
      name: 'created_at'
    }
  },
  relations: {
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
  checks: [
    {
      name: 'CHK_session_expires_after_created',
      expression: '"expires_at" > "created_at"'
    }
  ],
  indices: [
    {
      name: 'IDX_session_user_google_id',
      columns: ['userGoogleId']
    }
  ]
});
