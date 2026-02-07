import type { QuestDefinition } from '../../shared/src/types.js';
import type { Session } from './world.js';

export class QuestSystem {
  private quests: QuestDefinition[] = [
    {
      id: 'quest-river',
      title: 'Find the Silent River',
      difficulty: 2,
      hint: 'Follow the damp air and listen for stones.',
      targetAreaId: 'meadow'
    },
    {
      id: 'quest-ruins',
      title: 'Echoes in the Ruins',
      difficulty: 4,
      hint: 'The broken archway hides a whispering glyph.',
      targetAreaId: 'ruins'
    }
  ];

  constructor(private rng: () => number) {}

  offerQuest(session: Session, fromEntityId: string) {
    const quest = this.quests[Math.floor(this.rng() * this.quests.length)];
    session.send({
      type: 'QuestOffer',
      data: {
        fromEntityId,
        questId: quest.id,
        title: quest.title,
        difficulty: quest.difficulty,
        hint: quest.hint
      }
    });
  }
}
