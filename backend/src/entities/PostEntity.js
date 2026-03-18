import { EntitySchema } from 'typeorm';

export const PostEntity = new EntitySchema({
  name: 'Post',
  tableName: 'posts',
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    authorGoogleId: {
      type: String,
      nullable: false,
      name: 'author_google_id'
    },
    authorName: {
      type: String,
      nullable: false,
      name: 'author_name'
    },
    authorEmail: {
      type: String,
      nullable: false,
      name: 'author_email'
    },
    content: {
      type: 'text',
      nullable: false
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
      name: 'IDX_post_created_at',
      columns: ['createdAt']
    },
    {
      name: 'IDX_post_author_google_id',
      columns: ['authorGoogleId']
    }
  ]
});
