import { EntitySchema } from 'typeorm';

export const HcmWardEntity = new EntitySchema({
  name: 'HcmWard',
  tableName: 'hcm_wards',
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    provinceCode: {
      type: Number,
      nullable: false,
      default: 79,
      name: 'province_code'
    },
    provinceName: {
      type: String,
      nullable: false,
      name: 'province_name'
    },
    districtCode: {
      type: Number,
      nullable: false,
      name: 'district_code'
    },
    districtName: {
      type: String,
      nullable: false,
      name: 'district_name'
    },
    districtDivisionType: {
      type: String,
      nullable: true,
      name: 'district_division_type'
    },
    wardCode: {
      type: Number,
      nullable: false,
      unique: true,
      name: 'ward_code'
    },
    wardName: {
      type: String,
      nullable: false,
      name: 'ward_name'
    },
    wardDivisionType: {
      type: String,
      nullable: true,
      name: 'ward_division_type'
    },
    sourceUrl: {
      type: String,
      nullable: false,
      name: 'source_url'
    },
    latitude: {
      type: 'double precision',
      nullable: true
    },
    longitude: {
      type: 'double precision',
      nullable: true
    },
    syncedAt: {
      type: 'timestamptz',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP',
      name: 'synced_at'
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
      name: 'IDX_hcm_wards_district_code',
      columns: ['districtCode']
    },
    {
      name: 'IDX_hcm_wards_ward_name',
      columns: ['wardName']
    }
  ]
});
