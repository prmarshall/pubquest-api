# PubQuest API

Backend API for PubQuest — a location-based social RPG that gamifies pub crawls.

Players check into real-world venues, complete quests given by NPCs, earn XP and gold, level up, and team up with friends in parties. Think World of Warcraft meets pub crawling.

### Core Features

- **Venue check-ins** with GPS geofencing and live player counts
- **Quest system** with a full state machine (locked → available → active → completed), multi-step objectives, prerequisites, and repeatable quests
- **NPC dialogue** with branching conversation trees that respond to quest state
- **Parties and friends** — form groups, send invites, track each other's locations
- **RPG progression** — XP, leveling, gold rewards
- **Real-time updates** via Socket.IO

## Getting Started

```bash
npm install
cp .env.local .env        # or use .env.local directly (loaded by default)
docker compose up -d       # start PostgreSQL, Redis, MinIO
npm run migrate
npm run seed
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with nodemon |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled app |
| `npm run migrate` | Run database migrations |
| `npm run seed` | Seed the database |
| `npm run seed:dev` | Seed and start dev server |

## Documentation

- [Quest Quickstart](QUEST_QUICKSTART.md)
- [Quest System Guide](QUEST_SYSTEM_GUIDE.md)
- [Quest Architecture](QUEST_ARCHITECTURE.md)
- [Quest System Summary](QUEST_SYSTEM_SUMMARY.md)
- [Storage](STORAGE.md)
- [Scalability](SCALABILITY.md)
