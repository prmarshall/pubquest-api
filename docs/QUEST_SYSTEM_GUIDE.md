# Quest System Implementation Guide

This document explains how the PubQuest quest system implements industry-standard, data-driven architecture for RPG quests.

## 🏗️ Architecture Overview

### The Three Pillars

1. **Quest Definition (Static Data)** - The "template" that defines what a quest is
2. **Quest Progress (Player Data)** - The "save file" that tracks what the player has done
3. **Quest Engine (Logic)** - The "brain" that processes events and updates progress

---

## 📋 1. Quest Definition (The Template)

Quests are defined as **data**, not code. See `quest.templates.ts`.

```typescript
{
  id: 2,
  title: "The Legendary Pint",
  description: "Help Kat find a mythical drink...",

  prerequisites: {
    minLevel: 2,
    completedQuests: [1]
  },

  objectives: [
    {
      type: "LOCATION",
      target_value: "CAT:PUB",
      target_count: 3,  // Visit 3 pubs
      description: "Visit 3 different pubs"
    },
    {
      type: "SPEND",
      target_value: "500",
      target_count: 1,
      description: "Spend 500 gold"
    }
  ],

  reward_xp: 500,
  reward_gold: 100
}
```

### Benefits

- ✅ Non-programmers can create quests
- ✅ Easy to localize (text separate from logic)
- ✅ Can be edited at runtime
- ✅ Version control friendly (JSON diffs)

---

## 🎮 2. Quest State Machine

Quests move through a series of states:

```
LOCKED → AVAILABLE → ACTIVE → READY → COMPLETED
```

| State         | Description           | Example             |
| ------------- | --------------------- | ------------------- |
| **LOCKED**    | Prerequisites not met | Need Level 5        |
| **AVAILABLE** | Can be accepted       | NPC shows ❗        |
| **ACTIVE**    | In player's quest log | Tracking objectives |
| **READY**     | Objectives complete   | NPC shows ❓        |
| **COMPLETED** | Rewards claimed       | Archived            |

### Implementation

```typescript
// Check if quest is available
const available = await QuestEngine.getAvailableQuests(client, userId);

// Accept quest (AVAILABLE → ACTIVE)
await QuestEngine.acceptQuest(client, userId, questId);

// Turn in quest (READY → COMPLETED)
await QuestEngine.turnInQuest(client, userId, questId);
```

---

## 📊 3. Objective Progress Tracking

Objectives support **incremental progress** (e.g., "Kill 5 Rats" = 3/5 complete).

### Database Schema

```sql
CREATE TABLE user_objective_progress (
  user_id INT,
  objective_id INT,
  current_progress INT,  -- 3 out of 5
  is_completed BOOLEAN
);
```

### How It Works

```typescript
// Objective: Visit 3 pubs
objective = {
  type: "LOCATION",
  target_value: "CAT:PUB",
  target_count: 3
}

// User visits 1st pub
current_progress: 0 → 1  // 1/3

// User visits 2nd pub
current_progress: 1 → 2  // 2/3

// User visits 3rd pub
current_progress: 2 → 3  // 3/3 ✅ Complete!
```

---

## 🎯 4. Event Broadcasting (Observer Pattern)

Instead of constantly checking "Is the rat dead?", the engine **listens** for events.

```typescript
// When user checks into a venue, broadcast event
const event: QuestEvent = {
  userId: 123,
  type: "LOCATION",
  data: {
    venueId: 5,
    venueCategory: "PUB",
  },
};

// Quest Engine listens and updates ALL matching objectives
await QuestEngine.processEvent(event);
```

### Flow

1. **Event Occurs** (User checks in)
2. **Engine Finds Matches** (Active objectives of type LOCATION)
3. **Handlers Evaluate** (Does this venue match the objective?)
4. **Progress Updates** (Increment counter, check if complete)
5. **Quest Completes** (All objectives done → READY state)

---

## 🗣️ 5. Dialogue System (Node-Based Graph)

Conversations are a **Directed Acyclic Graph (DAG)**, not linear scripts.

### Structure

```
[Root Node] "Hey, stranger!"
  ├─ [Choice 1] "Just passing through"
  │   └─ [NPC Response] "See you later!" → END
  └─ [Choice 2] "Tell me about that quest"
      └─ [NPC Response] "I need your help finding..."
          ├─ [Choice 1] "I'll do it!" → [ACCEPT_QUEST action]
          └─ [Choice 2] "Maybe later" → END
```

### Conditional Display

Nodes can have **conditions** - they only show if requirements are met:

```typescript
{
  conditions: {
    questState: { questId: 2, state: "ACTIVE" }
  },
  text: "How's the quest going?"
}
```

### Actions

Nodes can trigger **actions**:

```typescript
{
  actions: [
    { type: "ACCEPT_QUEST", questId: 2 },
    { type: "GIVE_GOLD", amount: 100 },
  ];
}
```

---

## 🔧 6. Objective Handlers

Each objective type has a **handler function** that evaluates events.

### Location Handler

```typescript
function handleLocationObjective(
  objective: ObjectiveDefinition,
  event: QuestEvent,
  currentProgress: number,
) {
  // Check if venue matches
  if (matches) {
    return {
      satisfied: newProgress >= objective.target_count,
      newProgress: currentProgress + 1,
    };
  }

  return { satisfied: false, newProgress: currentProgress };
}
```

### Spend Handler

```typescript
function handleSpendObjective(
  objective: ObjectiveDefinition,
  event: QuestEvent,
  currentProgress: number,
) {
  // Accumulate spending
  const newProgress = currentProgress + event.data.amountCents;

  return {
    satisfied: newProgress >= objective.target_value,
    newProgress,
  };
}
```

---

## 📁 7. Database Schema

### Key Tables

```sql
-- Quest definitions
quests (id, title, description, prerequisites, rewards)

-- Objectives (steps within quests)
quest_objectives (id, quest_id, type, target_value, target_count)

-- Player quest state
user_quests (user_id, quest_id, status, accepted_at, completed_at)

-- Player objective progress
user_objective_progress (user_id, objective_id, current_progress, is_completed)

-- Dialogue system
dialogue_nodes (id, npc_id, text, speaker, parent_node_id, conditions, actions)
```

---

## 🚀 8. Usage Examples

### Trigger Quest Event (Check-in)

```typescript
// User checks into a pub
await QuestEngine.processEvent({
  userId: user.id,
  type: "LOCATION",
  data: {
    venueId: venue.id,
    venueCategory: venue.category,
  },
});
```

### Trigger Quest Event (Purchase)

```typescript
// User makes a purchase
await QuestEngine.processEvent({
  userId: user.id,
  type: "SPEND",
  data: {
    amountCents: 1200,
    description: "2x Guinness",
    venueId: venue.id,
  },
});
```

### Start Dialogue

```typescript
const dialogue = await DialogueEngine.startConversation(
  userId,
  npcId
);

// Returns:
{
  npc: { id: 2, name: "Kat the Serveress" },
  text: "Hey there, stranger!",
  speaker: "NPC",
  choices: [
    { node_id: 1, text: "Just passing through" },
    { node_id: 2, text: "Tell me about that quest" }
  ]
}
```

### Select Dialogue Choice

```typescript
const response = await DialogueEngine.selectChoice(
  userId,
  npcId,
  nodeId
);

// If node has ACCEPT_QUEST action:
{
  npc: { ... },
  text: "Brilliant! Let's get started.",
  actions_triggered: [
    { type: "ACCEPT_QUEST", questId: 2 }
  ],
  quest_updates: [
    { quest_id: 2, new_state: "ACTIVE", message: "Quest accepted!" }
  ]
}
```

---

## 🎯 9. Best Practices

### ✅ DO

- **Separate data from logic** - Quests are data, engine is logic
- **Use event broadcasting** - Don't poll, listen for events
- **Atomic transactions** - Prevent race conditions with proper locking
- **Incremental progress** - Support "Kill 5 Rats" style objectives
- **Conditional branching** - Dialogue changes based on quest state

### ❌ DON'T

- **Hardcode quest logic** - Use handlers and templates instead
- **Check every tick** - Use observer pattern, not polling
- **Store duplicate data** - Save only deltas (progress), not full templates
- **Allow race conditions** - Use transactions and atomic updates
- **Mix UI and logic** - Keep dialogue text separate from conditions

---

## 🏆 10. Advantages of This System

| Feature            | Benefit                                    |
| ------------------ | ------------------------------------------ |
| **Data-Driven**    | Non-programmers can create content         |
| **Event-Based**    | Efficient, no constant polling             |
| **State Machine**  | Clear quest lifecycle                      |
| **Incremental**    | Supports complex objectives (3/5 complete) |
| **Prerequisites**  | Control quest availability                 |
| **Dialogue Graph** | Branching conversations                    |
| **Atomic Updates** | No duplicate completions                   |
| **Extensible**     | Easy to add new objective types            |

---

## 📚 11. How Industry Games Do It

### World of Warcraft

- Quest data in **DBC files** (binary database cache)
- Lua scripts for custom quest logic
- Quest IDs referenced in dialogue

### Skyrim

- **Quest stages** (similar to our objectives)
- **Dialogue conditions** check quest stage
- Papyrus scripts for complex quests

### The Witcher 3

- **Quest phases** with incremental progress
- **Dialogue trees** with conditional branches
- **Quest journal** updates dynamically

---

## 🔄 12. Migration Path

To migrate your database:

```bash
# Run the migration
docker exec -i pubquest_db psql -U evo -d pubquest < src/db/migrations/002_quest_system_enhancements.sql

# Load sample dialogue (optional)
docker exec -i pubquest_db psql -U evo -d pubquest < src/db/sample_dialogue.sql
```

---

## 🎓 13. Next Steps

### Immediate

1. Run database migration
2. Test quest acceptance/completion flows
3. Create sample dialogue graphs for NPCs

### Future Enhancements

- **Quest chains** - Quest A unlocks B, B unlocks C
- **Faction reputation** - Prerequisites based on standing
- **Item objectives** - "Collect 5 Dragon Scales"
- **Kill objectives** - "Defeat 10 Bandits"
- **Time-limited quests** - Expire after 24 hours
- **Party quests** - Shared progress with group
- **Dynamic rewards** - Scale with player level
- **Quest journal UI** - Track active/completed quests

---

## 💡 14. Key Takeaways

> "In games like WoW, the game code doesn't know what 'Kill 10 Rats' is; it just knows how to read a template and track variables."

This quest system:

- ✅ Separates **definition** (data) from **execution** (code)
- ✅ Uses **state machines** for clear lifecycle management
- ✅ Implements **observer pattern** for efficient event handling
- ✅ Supports **incremental progress** for complex objectives
- ✅ Provides **dialogue graphs** for branching conversations
- ✅ Maintains **atomic transactions** to prevent bugs

You now have a **production-grade quest system** that scales from simple "go here" quests to complex multi-stage story arcs!
