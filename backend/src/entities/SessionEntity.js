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
  indices: [
    {
      name: 'IDX_session_user_google_id',
      columns: ['userGoogleId']
    }
  ]
});
