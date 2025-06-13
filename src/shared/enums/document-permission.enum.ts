export enum DocumentPermission {
  OWNER = 'owner', // 모든 권한 (삭제, 권한 변경 포함)
  EDITOR = 'editor', // 편집 권한
  COMMENTER = 'commenter', // 댓글만 가능
  VIEWER = 'viewer', // 읽기 전용
}
