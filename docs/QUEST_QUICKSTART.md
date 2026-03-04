# Quest System Quick Start Checklist

## ✅ Implementation Checklist

### 1. Database Migration

```bash
cd pubquest-backend
docker exec -i pubquest_db psql -U evo -d pubquest < src/db/migrations/002_quest_system_enhancements.sql
```

**What this does:**

- ✅ Adds prerequisites column to quests
- ✅ Adds state machine fields to user_quests
- ✅ Adds incremental progress to user_objective_progress
- ✅ Creates dialogue_nodes table
- ✅ Updates existing data for compatibility

---

### 2. Optional: Load Sample Dialogue

```bash
docker exec -i pubquest_db psql -U evo -d pubquest < src/db/sample_dialogue.sql
```

**What this does:**

- ✅ Creates conversation tree for Kat the Serveress (NPC ID 2)
- ✅ Shows quest states: Not Started, Active, Ready, Completed
- ✅ Includes ACCEPT_QUEST and COMPLETE_QUEST actions

---

### 3. Test Quest Events (Already Working!)

Your existing check-in code already works:

```typescript
// This is already in your codebase!
await QuestEngine.processEvent({
  userId: user.id,
  type: "LOCATION",
  data: {
    venueId: venue.id,
    venueCategory: venue.category,
  },
});
```

**What's new:**

- ✅ Now supports incremental progress (3/5 pubs visited)
- ✅ Tracks progress per objective
- ✅ Returns quest completion info

---

### 4. Create API Routes (To Do)

Create these new endpoints in your API:

#### GET /api/quests/available

```typescript
// In quests.controller.ts
export async function getAvailableQuests(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const quests = await QuestEngine.getAvailableQuests(client, req.userId);
    res.json({ quests });
  } finally {
    client.release();
  }
}
```

#### POST /api/quests/:id/accept

```typescript
export async function acceptQuest(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const result = await QuestEngine.acceptQuest(
      client,
      req.userId,
      parseInt(req.params.id),
    );
    res.json(result);
  } finally {
    client.release();
  }
}
```

#### POST /api/quests/:id/turn-in

```typescript
export async function turnInQuest(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const result = await QuestEngine.turnInQuest(
      client,
      req.userId,
      parseInt(req.params.id),
    );
    res.json(result);
  } finally {
    client.release();
  }
}
```

#### GET /api/quests/active

```typescript
export async function getActiveQuests(req: Request, res: Response) {
  const result = await pool.query(
    `SELECT 
      q.id,
      q.title,
      q.description,
      q.reward_xp,
      q.reward_gold,
      uq.status,
      uq.accepted_at,
      json_agg(
        json_build_object(
          'id', qo.id,
          'description', qo.description,
          'current_progress', uop.current_progress,
          'target_count', qo.target_count,
          'is_completed', uop.is_completed
        ) ORDER BY qo.order_index
      ) as objectives
    FROM user_quests uq
    JOIN quests q ON uq.quest_id = q.id
    JOIN quest_objectives qo ON qo.quest_id = q.id
    JOIN user_objective_progress uop ON uop.objective_id = qo.id AND uop.user_id = uq.user_id
    WHERE uq.user_id = $1
      AND uq.status IN ('ACTIVE', 'READY')
    GROUP BY q.id, uq.id`,
    [req.userId],
  );

  res.json({ quests: result.rows });
}
```

---

### 5. Dialogue System Routes (Optional)

#### POST /api/npcs/:id/talk

```typescript
export async function talkToNPC(req: Request, res: Response) {
  const dialogue = await DialogueEngine.startConversation(
    req.userId,
    parseInt(req.params.id),
  );
  res.json(dialogue);
}
```

#### POST /api/dialogue/choose

```typescript
export async function chooseDialogue(req: Request, res: Response) {
  const { npcId, nodeId } = req.body;

  const response = await DialogueEngine.selectChoice(req.userId, npcId, nodeId);

  res.json(response);
}
```

---

### 6. Frontend Updates (Optional)

#### Quest Journal UI

- Display active quests with progress bars
- Show objectives: "Visit 3 pubs (2/3 ✅)"
- Color-code by state: ACTIVE (yellow), READY (green)

#### Quest Notifications

- Show toast when objective completed: "Objective Complete! +50 XP"
- Show when quest ready: "Quest Ready! Return to Kat"
- Show on quest complete: "Quest Complete! +500 XP, +100 Gold"

#### NPC Interactions

- Show ❗ icon when NPC has available quest
- Show ❓ icon when quest is ready to turn in
- Display dialogue tree with clickable choices

---

## 🧪 Testing Checklist

### Test 1: Quest Prerequisites

```sql
-- User level 1 should NOT see level 5 quests
SELECT * FROM quests WHERE prerequisites->>'minLevel' IS NOT NULL;
```

### Test 2: Quest Acceptance

```typescript
// Accept quest
await QuestEngine.acceptQuest(client, userId, questId);

// Verify status
const result = await pool.query(
  "SELECT status FROM user_quests WHERE user_id = $1 AND quest_id = $2",
  [userId, questId],
);
// Should be 'ACTIVE'
```

### Test 3: Incremental Progress

```typescript
// User checks into 1st pub
await QuestEngine.processEvent({ userId, type: "LOCATION", data: { venueId: 1, venueCategory: "PUB" }});

// Check progress
const progress = await pool.query(
  'SELECT current_progress FROM user_objective_progress WHERE user_id = $1 AND objective_id = $2',
  [userId, objectiveId]
);
// Should be 1

// User checks into 2nd pub
await QuestEngine.processEvent(...);
// Progress should be 2
```

### Test 4: Quest Completion

```typescript
// Complete all objectives
// ... (trigger events for all objectives)

// Verify quest state is READY
const quest = await pool.query(
  "SELECT status FROM user_quests WHERE user_id = $1 AND quest_id = $2",
  [userId, questId],
);
// Should be 'READY'

// Turn in quest
await QuestEngine.turnInQuest(client, userId, questId);

// Verify rewards received
const user = await pool.query("SELECT xp, gold FROM users WHERE id = $1", [
  userId,
]);
// XP and gold should be increased
```

### Test 5: Dialogue Actions

```typescript
// Start conversation
const dialogue = await DialogueEngine.startConversation(userId, npcId);

// Select "Accept Quest" choice
const response = await DialogueEngine.selectChoice(userId, npcId, acceptNodeId);

// Verify quest was accepted
// response.quest_updates should contain { quest_id, new_state: "ACTIVE" }
```

---

## 🎯 Next Steps

### Immediate (Must Do)

1. ✅ Run database migration
2. ⬜ Create quest API routes
3. ⬜ Test quest acceptance flow
4. ⬜ Test objective completion
5. ⬜ Test quest turn-in

### Short Term (Should Do)

6. ⬜ Add frontend quest journal UI
7. ⬜ Add quest notifications/toasts
8. ⬜ Create more quest templates
9. ⬜ Design dialogue trees for all NPCs
10. ⬜ Add NPC visual indicators (❗❓)

### Long Term (Nice to Have)

11. ⬜ Quest chains (Quest B unlocks after Quest A)
12. ⬜ Time-limited quests (expire after 24h)
13. ⬜ Party quests (shared progress)
14. ⬜ Dynamic rewards (scale with level)
15. ⬜ Item objectives ("Collect 5 Dragon Scales")
16. ⬜ Kill objectives ("Defeat 10 Bandits")
17. ⬜ Faction reputation system
18. ⬜ Quest editor UI for admins

---

## 📚 Documentation

- **QUEST_SYSTEM_SUMMARY.md** - Overview and usage examples
- **QUEST_SYSTEM_GUIDE.md** - Comprehensive implementation guide
- **quest.templates.ts** - Quest definition examples
- **sample_dialogue.sql** - Dialogue tree example

---

## 🆘 Troubleshooting

### "Quest not showing up"

- Check prerequisites (minLevel, completedQuests)
- Verify quest not already active
- Check `getAvailableQuests()` filters

### "Progress not updating"

- Check event type matches objective type
- Verify target_value matches event data
- Check user has active quest with this objective

### "Can't turn in quest"

- Verify all objectives completed (`is_completed = TRUE`)
- Check quest status is 'READY'
- Ensure user hasn't already completed quest

### "Dialogue not showing"

- Check dialogue node conditions
- Verify is_root = TRUE for starting nodes
- Check NPC ID matches

---

## ✨ You're Ready!

You now have a **professional quest system** that matches AAA RPGs. Start by running the migration, then create the API routes, and you'll have working quests! 🎮
