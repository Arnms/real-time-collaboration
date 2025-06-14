import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1704067200000 implements MigrationInterface {
  name = 'InitialMigration1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // users 테이블 생성
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM('admin', 'user', 'guest')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "username" character varying NOT NULL,
        "password" character varying NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT 'user',
        "avatarUrl" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "lastLoginAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // documents 테이블 생성
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "content" text NOT NULL DEFAULT '',
        "metadata" jsonb,
        "version" integer NOT NULL DEFAULT 1,
        "isPublic" boolean NOT NULL DEFAULT false,
        "isTemplate" boolean NOT NULL DEFAULT false,
        "templateCategory" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "ownerId" uuid NOT NULL,
        CONSTRAINT "PK_documents" PRIMARY KEY ("id")
      )
    `);

    // document_permissions 테이블 생성
    await queryRunner.query(`
      CREATE TYPE "document_permission_enum" AS ENUM('owner', 'editor', 'commenter', 'viewer')
    `);

    await queryRunner.query(`
      CREATE TABLE "document_permissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "permission" "document_permission_enum" NOT NULL DEFAULT 'viewer',
        "invitedBy" character varying,
        "invitedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" uuid NOT NULL,
        "documentId" uuid NOT NULL,
        CONSTRAINT "UQ_document_permissions_user_document" UNIQUE ("userId", "documentId"),
        CONSTRAINT "PK_document_permissions" PRIMARY KEY ("id")
      )
    `);

    // rooms 테이블 생성
    await queryRunner.query(`
      CREATE TABLE "rooms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "maxParticipants" integer NOT NULL DEFAULT 10,
        "settings" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "documentId" uuid NOT NULL,
        CONSTRAINT "PK_rooms" PRIMARY KEY ("id")
      )
    `);

    // room_participants 테이블 생성
    await queryRunner.query(`
      CREATE TABLE "room_participants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nickname" character varying,
        "color" character varying NOT NULL DEFAULT '#3B82F6',
        "isOnline" boolean NOT NULL DEFAULT true,
        "lastSeenAt" TIMESTAMP,
        "cursorPosition" jsonb,
        "joinedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" uuid NOT NULL,
        "roomId" uuid NOT NULL,
        CONSTRAINT "UQ_room_participants_user_room" UNIQUE ("userId", "roomId"),
        CONSTRAINT "PK_room_participants" PRIMARY KEY ("id")
      )
    `);

    // operations 테이블 생성
    await queryRunner.query(`
      CREATE TYPE "operation_type_enum" AS ENUM('insert', 'delete', 'retain', 'format')
    `);

    await queryRunner.query(`
      CREATE TABLE "operations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "operation_type_enum" NOT NULL,
        "position" integer NOT NULL,
        "length" integer,
        "content" text,
        "attributes" jsonb,
        "documentVersion" integer NOT NULL,
        "isApplied" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "authorId" uuid NOT NULL,
        "documentId" uuid NOT NULL,
        CONSTRAINT "PK_operations" PRIMARY KEY ("id")
      )
    `);

    // 외래 키 제약 조건 추가
    await queryRunner.query(`
      ALTER TABLE "documents" 
      ADD CONSTRAINT "FK_documents_owner" 
      FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "document_permissions" 
      ADD CONSTRAINT "FK_document_permissions_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "document_permissions" 
      ADD CONSTRAINT "FK_document_permissions_document" 
      FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "rooms" 
      ADD CONSTRAINT "FK_rooms_document" 
      FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "room_participants" 
      ADD CONSTRAINT "FK_room_participants_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "room_participants" 
      ADD CONSTRAINT "FK_room_participants_room" 
      FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "operations" 
      ADD CONSTRAINT "FK_operations_author" 
      FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "operations" 
      ADD CONSTRAINT "FK_operations_document" 
      FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE
    `);

    // 인덱스 생성
    await queryRunner.query(
      `CREATE INDEX "IDX_operations_document_version" ON "operations" ("documentId", "documentVersion")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_documents_owner" ON "documents" ("ownerId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_documents_public" ON "documents" ("isPublic")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_email" ON "users" ("email")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 테이블 삭제 (역순)
    await queryRunner.query(`DROP TABLE "operations"`);
    await queryRunner.query(`DROP TABLE "room_participants"`);
    await queryRunner.query(`DROP TABLE "rooms"`);
    await queryRunner.query(`DROP TABLE "document_permissions"`);
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TABLE "users"`);

    // ENUM 타입 삭제
    await queryRunner.query(`DROP TYPE "operation_type_enum"`);
    await queryRunner.query(`DROP TYPE "document_permission_enum"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
