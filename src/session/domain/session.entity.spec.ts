import { Session } from './session.entity';

describe('Session', () => {
  describe('create', () => {
    it('새 세션을 생성한다', () => {
      const session = Session.create('test-id');

      expect(session.id).toBe('test-id');
      expect(session.claudeSessionId).toBeNull();
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.lastUsedAt).toBeInstanceOf(Date);
    });

    it('createdAt과 lastUsedAt이 동일하다', () => {
      const session = Session.create('test-id');

      expect(session.createdAt.getTime()).toBe(session.lastUsedAt.getTime());
    });
  });

  describe('attachClaudeSession', () => {
    it('claudeSessionId를 설정하고 lastUsedAt을 갱신한다', () => {
      const session = Session.create('test-id');
      const originalLastUsedAt = session.lastUsedAt;

      session.attachClaudeSession('claude-123');

      expect(session.claudeSessionId).toBe('claude-123');
      expect(session.lastUsedAt.getTime()).toBeGreaterThanOrEqual(
        originalLastUsedAt.getTime(),
      );
    });

    it('빈 문자열이면 에러를 던진다', () => {
      const session = Session.create('test-id');

      expect(() => session.attachClaudeSession('')).toThrow(
        'Claude session ID must not be empty',
      );
    });

    it('공백만 있는 문자열이면 에러를 던진다', () => {
      const session = Session.create('test-id');

      expect(() => session.attachClaudeSession('   ')).toThrow(
        'Claude session ID must not be empty',
      );
    });
  });

  describe('toJSON', () => {
    it('직렬화 가능한 객체를 반환한다', () => {
      const session = Session.create('test-id');
      session.attachClaudeSession('claude-123');

      const json = session.toJSON();

      expect(json.id).toBe('test-id');
      expect(json.claudeSessionId).toBe('claude-123');
      expect(json.createdAt).toBeInstanceOf(Date);
      expect(json.lastUsedAt).toBeInstanceOf(Date);
    });
  });

  describe('touch', () => {
    it('lastUsedAt을 갱신한다', () => {
      const session = Session.create('test-id');
      const originalLastUsedAt = session.lastUsedAt;

      session.touch();

      expect(session.lastUsedAt.getTime()).toBeGreaterThanOrEqual(
        originalLastUsedAt.getTime(),
      );
    });
  });
});
