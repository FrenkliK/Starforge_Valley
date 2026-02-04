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
