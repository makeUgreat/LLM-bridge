export interface LlmTextEvent {
  type: 'text';
  text: string;
}

export interface LlmErrorEvent {
  type: 'error';
  error: string;
}

export interface LlmDoneEvent {
  type: 'done';
  exitCode: number | null;
}

export interface LlmAssistantEvent {
  type: 'assistant';
  message: {
    content: Array<{ type: string; text?: string }>;
  };
}

export interface LlmSessionIdEvent {
  session_id: string;
}

export interface LlmHeartbeatEvent {
  type: 'heartbeat';
}

export type PromptEvent =
  | LlmTextEvent
  | LlmErrorEvent
  | LlmDoneEvent
  | LlmAssistantEvent
  | LlmSessionIdEvent
  | LlmHeartbeatEvent;

export interface LlmEvent {
  data: PromptEvent;
}