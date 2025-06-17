import { DataSource } from 'typeorm';
import { Document } from '../../documents/entities/document.entity';
import { DocumentPermission } from '../../documents/entities/document-permission.entity';
import { User } from '../../users/entities/user.entity';
import { DocumentPermission as PermissionEnum } from '../../shared/enums/document-permission.enum';

export const seedDocuments = async (dataSource: DataSource) => {
  const documentRepository = dataSource.getRepository(Document);
  const permissionRepository = dataSource.getRepository(DocumentPermission);
  const userRepository = dataSource.getRepository(User);

  // 기존 사용자 조회
  const admin = await userRepository.findOne({
    where: { email: 'admin@example.com' },
  });
  const testUser = await userRepository.findOne({
    where: { email: 'user@example.com' },
  });
  const guest = await userRepository.findOne({
    where: { email: 'guest@example.com' },
  });

  if (!admin || !testUser || !guest) {
    console.log('❌ Users not found, skipping document seeding');
    return;
  }

  // 샘플 문서들 생성
  const sampleDocuments = [
    {
      title: '프로젝트 기획서',
      content: `# 실시간 협업 도구 프로젝트

## 프로젝트 개요
이 프로젝트는 Google Docs와 같은 실시간 협업 문서 편집 도구를 개발하는 것입니다.

## 주요 기능
1. 실시간 문서 편집
2. 사용자 권한 관리
3. 댓글 및 제안 기능
4. 버전 히스토리

## 기술 스택
- Backend: Node.js + NestJS
- Database: PostgreSQL
- Cache: Redis
- Frontend: React (예정)`,
      metadata: {
        theme: 'light',
        fontSize: 14,
        fontFamily: 'Arial',
        tags: ['프로젝트', '기획', '협업'],
      },
      isPublic: true,
      isTemplate: false,
      ownerId: admin.id,
    },
    {
      title: '회의록 템플릿',
      content: `# 회의록

**일시:** YYYY-MM-DD HH:MM
**참석자:** 
**회의 주제:** 

## 안건
1. 
2. 
3. 

## 논의 내용


## 결정 사항


## 액션 아이템
- [ ] 
- [ ] 
- [ ] 

## 다음 회의
**일시:** 
**안건:** `,
      metadata: {
        theme: 'light',
        fontSize: 12,
        fontFamily: 'Arial',
        tags: ['회의록', '템플릿'],
      },
      isPublic: true,
      isTemplate: true,
      templateCategory: '회의록',
      ownerId: admin.id,
    },
    {
      title: '개인 메모',
      content: `# 개인 메모

오늘 할 일:
- 문서 관리 시스템 구현 완료
- API 테스트
- 프론트엔드 계획 수립

참고사항:
- Redis 캐싱 구현 완료
- 권한 시스템 작동 확인 필요`,
      metadata: {
        theme: 'dark',
        fontSize: 13,
        fontFamily: 'Monaco',
        tags: ['개인', '메모', 'TODO'],
      },
      isPublic: false,
      isTemplate: false,
      ownerId: testUser.id,
    },
    {
      title: 'API 문서',
      content: `# API 문서

## 인증 API
\`\`\`
POST /api/auth/login
POST /api/auth/register
GET /api/auth/profile
\`\`\`

## 문서 API
\`\`\`
GET /api/documents/my
GET /api/documents/shared
POST /api/documents
PATCH /api/documents/:id
DELETE /api/documents/:id
\`\`\`

## 권한 관리 API
\`\`\`
POST /api/documents/:id/share
GET /api/documents/:id/permissions
\`\`\``,
      metadata: {
        theme: 'light',
        fontSize: 12,
        fontFamily: 'Consolas',
        tags: ['API', '문서', '개발'],
      },
      isPublic: false,
      isTemplate: false,
      ownerId: admin.id,
    },
  ];

  // 문서 생성
  for (const docData of sampleDocuments) {
    const existingDoc = await documentRepository.findOne({
      where: { title: docData.title, ownerId: docData.ownerId },
    });

    if (!existingDoc) {
      const document = documentRepository.create(docData);
      const savedDoc = await documentRepository.save(document);

      // 소유자 권한 생성
      await permissionRepository.save({
        userId: docData.ownerId,
        documentId: savedDoc.id,
        permission: PermissionEnum.OWNER,
      });

      console.log(`✅ Document created: ${savedDoc.title}`);

      // 일부 문서에 공유 권한 추가
      if (docData.title === '프로젝트 기획서') {
        // testUser에게 편집 권한 부여
        await permissionRepository.save({
          userId: testUser.id,
          documentId: savedDoc.id,
          permission: PermissionEnum.EDITOR,
          invitedBy: admin.id,
          invitedAt: new Date(),
        });

        // guest에게 보기 권한 부여
        await permissionRepository.save({
          userId: guest.id,
          documentId: savedDoc.id,
          permission: PermissionEnum.VIEWER,
          invitedBy: admin.id,
          invitedAt: new Date(),
        });

        console.log(`✅ Permissions added for: ${savedDoc.title}`);
      }

      if (docData.title === 'API 문서') {
        // testUser에게 댓글 권한 부여
        await permissionRepository.save({
          userId: testUser.id,
          documentId: savedDoc.id,
          permission: PermissionEnum.COMMENTER,
          invitedBy: admin.id,
          invitedAt: new Date(),
        });

        console.log(`✅ Commenter permission added for: ${savedDoc.title}`);
      }
    }
  }
};
