# Starforge Valley (Voxel Survival Sandbox)

## How to run
1. Install **Godot 4.2+**.
2. Open the project folder in Godot (`/workspace/newgame`).
3. Press **Play** to run `Main.tscn`.

## Current milestone
**M1 (Voxel world + meshing + player + place/break) is implemented.**

## Controls
- WASD: Move
- Mouse: Look
- Space: Jump
- Shift: Sprint
- E: Inventory (placeholder)
- Left Mouse: Break block
- Right Mouse: Place block
- Esc: Pause menu (placeholder)

## Repository layout
- `world/`: world generation, chunk streaming, and block storage
- `systems/`: player controller and core gameplay systems
- `rendering/`: rendering helpers (future)
- `entities/`: creatures and AI (future)
- `ui/`: HUD and menus (future)
- `data/`: data-driven definitions (blocks, items, recipes)
- `tests/`: validation scripts (placeholder)
- `docs/`: run notes and feature checklists

---

# Silent-Link RPG Prototype (Node.js)

This repository also contains a small, runnable prototype that demonstrates silent linking between players in a single-player RPG experience. The prototype lives in `/server`, `/client`, and `/shared`.

## Run the prototype

```bash
npm install
npm run dev
```

In another terminal, start clients:

```bash
npm run client -- --name Alice
npm run client -- --name Bob
npm run client -- --name Cara
```

Optional flags:
- `--optOut` to disable linking for a client.
- `--url ws://localhost:8080` to point at another server.

Server environment toggles:
- `ENABLE_LINKING=0` disables convergence entirely.
- `ENABLE_BOTS=0` disables bot spawning.

## Tests

```bash
npm run test
```

## Design notes

Silent linking is implemented by moving players between instances and only sending normal `WorldState` + entity join/leave updates. No explicit matchmaking event is emitted, so other entities appear like NPCs while still using proximity voice. Safehouses are excluded from linking, and players can opt out per-session or use the `SeverLink` item to return to isolation. These toggles are intentionally surfaced to keep the system ethical and avoid coercive multiplayer behavior.
