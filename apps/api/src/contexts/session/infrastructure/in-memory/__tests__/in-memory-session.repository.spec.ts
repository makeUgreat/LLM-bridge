import { describe, it, expect, beforeEach } from 'vitest';
import { InMemorySessionRepository } from '@contexts/session/infrastructure/in-memory/in-memory-session.repository.js';
import { Session } from '@contexts/session/domain/index.js';

describe('InMemorySessionRepository', () => {
  let repository: InMemorySessionRepository;

  beforeEach(() => {
    repository = new InMemorySessionRepository();
  });

  describe('save', () => {
    it('세션을 저장하고 반환한다', () => {
      const session = Session.create('id-1');
      const result = repository.save(session);

      expect(result).toBe(session);
      expect(repository.find({ id: 'id-1' })).toBe(session);
    });
  });

  describe('find', () => {
    it('존재하는 세션을 반환한다', () => {
      const session = Session.create('id-1');
      repository.save(session);

      expect(repository.find({ id: 'id-1' })).toBe(session);
    });

    it('존재하지 않는 세션은 undefined를 반환한다', () => {
      expect(repository.find({ id: 'nonexistent' })).toBeUndefined();
    });
  });

  describe('list', () => {
    it('모든 세션을 반환한다', () => {
      repository.save(Session.create('1'));
      repository.save(Session.create('2'));

      expect(repository.list()).toHaveLength(2);
    });

    it('세션이 없으면 빈 배열을 반환한다', () => {
      expect(repository.list()).toEqual([]);
    });
  });

  describe('remove', () => {
    it('세션을 삭제하고 true를 반환한다', () => {
      repository.save(Session.create('id-1'));

      expect(repository.remove('id-1')).toBe(true);
      expect(repository.find({ id: 'id-1' })).toBeUndefined();
    });

    it('존재하지 않는 세션 삭제 시 false를 반환한다', () => {
      expect(repository.remove('nonexistent')).toBe(false);
    });
  });

  describe('removeExpired', () => {
    it('만료된 세션만 삭제하고 삭제 건수를 반환한다', () => {
      const expired = new Session('id-1', null, new Date(0), new Date(0));
      const active = Session.create('id-2');

      repository.save(expired);
      repository.save(active);

      const removed = repository.removeExpired(30000);

      expect(removed).toBe(1);
      expect(repository.find({ id: 'id-1' })).toBeUndefined();
      expect(repository.find({ id: 'id-2' })).toBeDefined();
    });

    it('만료된 세션이 없으면 0을 반환한다', () => {
      repository.save(Session.create('id-1'));

      expect(repository.removeExpired(30000)).toBe(0);
    });

    it('세션이 없으면 0을 반환한다', () => {
      expect(repository.removeExpired(30000)).toBe(0);
    });
  });
});
