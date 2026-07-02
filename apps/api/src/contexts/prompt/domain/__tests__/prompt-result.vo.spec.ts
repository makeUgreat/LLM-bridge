import { describe, it, expect } from 'vitest';
import { PromptResult } from '@contexts/prompt/domain/index.js';

describe('PromptResult', () => {
  it('텍스트, 에러, 종료코드를 포함한 결과를 생성한다', () => {
    const result = PromptResult.create({
      text: 'hello world',
      error: null,
      exitCode: 0,
    });

    expect(result.text).toBe('hello world');
    expect(result.error).toBeNull();
    expect(result.exitCode).toBe(0);
  });

  it('에러가 있는 결과를 생성한다', () => {
    const result = PromptResult.create({
      text: '',
      error: 'something went wrong',
      exitCode: 1,
    });

    expect(result.text).toBe('');
    expect(result.error).toBe('something went wrong');
    expect(result.exitCode).toBe(1);
  });
});
