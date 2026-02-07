import type { EntityId } from '../../shared/src/types.js';

export type VoiceSessionLog = {
  speakerId: EntityId;
  listenerId: EntityId;
  timestamp: number;
};

export type ReportLog = {
  reporterId: EntityId;
  speakerId: EntityId;
  reason: string;
  timestamp: number;
};

export class ModerationLogger {
  voiceSessions: VoiceSessionLog[] = [];
  reports: ReportLog[] = [];

  logVoiceSession(speakerId: EntityId, listenerId: EntityId) {
    this.voiceSessions.push({ speakerId, listenerId, timestamp: Date.now() });
  }

  logReport(reporterId: EntityId, speakerId: EntityId, reason: string) {
    this.reports.push({ reporterId, speakerId, reason, timestamp: Date.now() });
  }
}
