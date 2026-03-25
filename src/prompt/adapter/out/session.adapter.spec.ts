import { SessionReaderAdapter, SessionManagerAdapter } from './session.adapter';
import { SessionService } from '../../../session/application/session.service';
import { Session } from '../../../session/domain/session.entity';

describe('SessionReaderAdapter', () => {
  let adapter: SessionReaderAdapter;

  const mockSessionService = {
    create: jest.fn(),
    findOne: jest.fn(),
    touch: jest.fn(),
    updateClaudeSessionId: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new SessionReaderAdapter(
      mockSessionService as unknown as SessionService,
    );
  });

  it('findById를 SessionService.findOne에 위임한다', () => {
    const session = Session.create('id-1');
    mockSessionService.findOne.mockReturnValue(session);

    expect(adapter.findById('id-1')).toBe(session);
    expect(mockSessionService.findOne).toHaveBeenCalledWith('id-1');
  });
});

describe('SessionManagerAdapter', () => {
  let adapter: SessionManagerAdapter;

  const mockSessionService = {
    create: jest.fn(),
    findOne: jest.fn(),
    touch: jest.fn(),
    updateClaudeSessionId: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new SessionManagerAdapter(
      mockSessionService as unknown as SessionService,
    );
  });

  it('create를 SessionService에 위임한다', () => {
    const session = Session.create('id-1');
    mockSessionService.create.mockReturnValue(session);

    expect(adapter.create()).toBe(session);
    expect(mockSessionService.create).toHaveBeenCalled();
  });

  it('touch를 SessionService에 위임한다', () => {
    adapter.touch('id-1');

    expect(mockSessionService.touch).toHaveBeenCalledWith('id-1');
  });

  it('updateClaudeSessionId를 SessionService에 위임한다', () => {
    adapter.updateClaudeSessionId('id-1', 'claude-123');

    expect(mockSessionService.updateClaudeSessionId).toHaveBeenCalledWith(
      'id-1',
      'claude-123',
    );
  });

  it('remove를 SessionService에 위임한다', () => {
    mockSessionService.remove.mockReturnValue(true);

    expect(adapter.remove('id-1')).toBe(true);
    expect(mockSessionService.remove).toHaveBeenCalledWith('id-1');
  });
});
