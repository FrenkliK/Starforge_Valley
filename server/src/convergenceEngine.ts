import type { AreaId, EntityId } from '../../shared/src/types.js';
import { mulberry32, randomChoice } from '../../shared/src/utils.js';
import type { World, Session } from './world.js';
import type { ModerationLogger } from './moderationLogger.js';

export class ConvergenceEngine {
  private rng: () => number;
  private droughtMs = 0;

  constructor(
    private world: World,
    seed: number,
    private debugMode: boolean,
    private moderation: ModerationLogger
  ) {
    this.rng = mulberry32(seed + 99);
  }

  tick(deltaMs: number) {
    this.droughtMs += deltaMs;
    const baseChance = this.debugMode ? 0.6 : 0.08;
    const droughtFactor = Math.min(2, this.droughtMs / (this.debugMode ? 2000 : 15000));
    const shouldConverge = this.rng() < baseChance * droughtFactor;
    if (!shouldConverge) return;
    const candidateAreas = this.world.areas.filter((area) => area.type !== 'safehouse');
    if (candidateAreas.length === 0) return;

    const weightedArea = this.weightedArea(candidateAreas);
    this.convergeArea(weightedArea.id);
    this.droughtMs = 0;
  }

  reportSpeaker(session: Session, speakerId: EntityId, reason: string) {
    this.moderation.logReport(session.id, speakerId, reason);
  }

  private weightedArea(areas: { id: AreaId; convergenceWeight: number }[]) {
    const total = areas.reduce((sum, area) => sum + area.convergenceWeight, 0);
    let roll = this.rng() * total;
    for (const area of areas) {
      roll -= area.convergenceWeight;
      if (roll <= 0) return area;
    }
    return randomChoice(areas, this.rng);
  }

  private convergeArea(areaId: AreaId) {
    const instances = this.world.getInstances(areaId).filter((instance) => instance.countPlayers() > 0);
    if (instances.length < 2) return;

    const target = randomChoice(instances, this.rng);
    const source = randomChoice(instances.filter((inst) => inst.id !== target.id), this.rng);
    const movable = this.world
      .getSessionsInInstance(source)
      .filter((session) => session.player && !session.player.optOutLinking);
    if (movable.length === 0) return;

    const moveCount = Math.max(1, Math.floor(this.rng() * movable.length));
    const selected = movable.slice(0, moveCount);

    for (const session of selected) {
      if (!session.player) continue;
      this.world.movePlayerToInstance(session, target);
    }

    this.world.enforceSoftCap(areaId);
  }
}
