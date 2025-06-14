import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableUuidExtension1704067100000 implements MigrationInterface {
  name = 'EnableUuidExtension1704067100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // UUID 확장 활성화
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // UUID 확장 비활성화 (주의: 다른 테이블에서 사용 중일 수 있음)
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
