import { describe, it, expect } from 'vitest';
import { Session } from '@contexts/session/domain/index';
import { Entity } from '@kernels/domain/index';

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

    it('Entity base를 상속하고 base props를 포함한다', () => {
      const session = Session.create('test-id');

      expect(session).toBeInstanceOf(Entity);
      expect(session.getProps()).toMatchObject({
        id: 'test-id',
        claudeSessionId: null,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        lastUsedAt: session.lastUsedAt,
      });
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
      expect(session.updatedAt.getTime()).toBe(session.lastUsedAt.getTime());
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

  describe('isExpired', () => {
    it('TTL 내의 세션은 만료되지 않는다', () => {
      const session = Session.create('test-id');
      const now = new Date(session.lastUsedAt.getTime() + 1000);

      expect(session.isExpired(30000, now)).toBe(false);
    });

    it('TTL 초과 세션은 만료된다', () => {
      const session = Session.create('test-id');
      const now = new Date(session.lastUsedAt.getTime() + 30001);

      expect(session.isExpired(30000, now)).toBe(true);
    });

    it('lastUsedAt 기준으로 판단한다', () => {
      const session = Session.create('test-id');

      // touch로 lastUsedAt 갱신
      session.touch();
      const now = new Date(session.lastUsedAt.getTime() + 1000);

      expect(session.isExpired(30000, now)).toBe(false);
    });

    it('TTL 경계값에서는 만료되지 않는다', () => {
      const session = Session.create('test-id');
      const now = new Date(session.lastUsedAt.getTime() + 30000);

      expect(session.isExpired(30000, now)).toBe(false);
    });
  });
});
