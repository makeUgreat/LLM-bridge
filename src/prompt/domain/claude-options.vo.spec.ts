import { ClaudeOptions } from './claude-options.vo';

describe('ClaudeOptions', () => {
  const validParams = {
    prompt: 'hello',
    sessionId: 'sess-1',
    claudeSessionId: null as string | null,
  };

  describe('create', () => {
    it('유효한 파라미터로 VO를 생성한다', () => {
      const options = ClaudeOptions.create(validParams);

      expect(options.prompt).toBe('hello');
      expect(options.sessionId).toBe('sess-1');
      expect(options.claudeSessionId).toBeNull();
    });

    it('optional 필드를 포함하여 생성한다', () => {
      const options = ClaudeOptions.create({
        ...validParams,
        workingDir: '/tmp',
        model: 'opus',
        permissionMode: 'plan',
        allowedTools: ['Read', 'Write'],
        systemPrompt: 'be nice',
      });

      expect(options.workingDir).toBe('/tmp');
      expect(options.model).toBe('opus');
      expect(options.permissionMode).toBe('plan');
      expect(options.allowedTools).toEqual(['Read', 'Write']);
      expect(options.systemPrompt).toBe('be nice');
    });

    it('빈 prompt이면 에러를 던진다', () => {
      expect(() =>
        ClaudeOptions.create({ ...validParams, prompt: '' }),
      ).toThrow('Prompt must not be empty');
    });

    it('공백만 있는 prompt이면 에러를 던진다', () => {
      expect(() =>
        ClaudeOptions.create({ ...validParams, prompt: '   ' }),
      ).toThrow('Prompt must not be empty');
    });

    it('allowedTools 배열을 방어적으로 복사한다', () => {
      const tools = ['Read', 'Write'];
      const options = ClaudeOptions.create({
        ...validParams,
        allowedTools: tools,
      });

      tools.push('Bash');

      expect(options.allowedTools).toEqual(['Read', 'Write']);
    });
  });
});
