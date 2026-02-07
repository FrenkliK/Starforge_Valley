export type Vector2 = { x: number; y: number };
export type AreaId = string;
export type EntityId = string;

export type EntityKind = 'player' | 'npc' | 'bot';

export type EntityBase = {
  id: EntityId;
  kind: EntityKind;
  pos: Vector2;
  areaId: AreaId;
  name?: string;
};

export type ClientHello = {
  name: string;
  optOutLinking: boolean;
};

export type ClientEnterArea = {
  areaId: AreaId;
};

export type ClientMove = {
  pos: Vector2;
};

export type ClientSpeak = {
  frames: string;
  durationMs: number;
  transcriptHint?: string;
};

export type ClientUseItem = {
  itemId: string;
};

export type ClientMuteSpeaker = {
  speakerId: EntityId;
  muted: boolean;
};

export type ClientReportSpeaker = {
  speakerId: EntityId;
  reason: string;
};

export type ServerWelcome = {
  playerId: EntityId;
};

export type ServerWorldState = {
  areaId: AreaId;
  entities: EntityBase[];
};

export type ServerEntityJoined = {
  entity: EntityBase;
};

export type ServerEntityLeft = {
  entityId: EntityId;
};

export type ServerEntityMoved = {
  entityId: EntityId;
  pos: Vector2;
};

export type ServerVoiceFrame = {
  speakerId: EntityId;
  frames: string;
  durationMs: number;
};

export type ServerQuestOffer = {
  fromEntityId: EntityId;
  questId: string;
  title: string;
  difficulty: number;
  hint: string;
};

export type ServerDamageEvent = {
  sourceId: EntityId;
  amount: number;
};

export type ServerNotice = {
  type: 'info' | 'warning' | 'error';
  message: string;
};

export type ClientMessage =
  | { type: 'Hello'; data: ClientHello }
  | { type: 'EnterArea'; data: ClientEnterArea }
  | { type: 'Move'; data: ClientMove }
  | { type: 'Speak'; data: ClientSpeak }
  | { type: 'UseItem'; data: ClientUseItem }
  | { type: 'MuteSpeaker'; data: ClientMuteSpeaker }
  | { type: 'ReportSpeaker'; data: ClientReportSpeaker };

export type ServerMessage =
  | { type: 'Welcome'; data: ServerWelcome }
  | { type: 'WorldState'; data: ServerWorldState }
  | { type: 'EntityJoined'; data: ServerEntityJoined }
  | { type: 'EntityLeft'; data: ServerEntityLeft }
  | { type: 'EntityMoved'; data: ServerEntityMoved }
  | { type: 'VoiceFrame'; data: ServerVoiceFrame }
  | { type: 'QuestOffer'; data: ServerQuestOffer }
  | { type: 'DamageEvent'; data: ServerDamageEvent }
  | { type: 'Notice'; data: ServerNotice };

export type AreaConfig = {
  id: AreaId;
  type: 'safehouse' | 'field' | 'dungeon';
  softCap: number;
  convergenceWeight: number;
};

export type QuestDefinition = {
  id: string;
  title: string;
  difficulty: number;
  hint: string;
  targetAreaId: AreaId;
};
