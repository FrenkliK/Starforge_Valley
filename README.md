# Starforge Valley

**A first-person voxel survival sandbox built with Godot 4.** Explore a procedurally generated landscape, shape it block by block, and build a place of your own.

> Early prototype. World generation, chunk streaming, first-person movement, and basic block placement and removal are implemented. Inventory, crafting, survival systems, and saving are planned work.

## Run it

1. Install [Godot 4.2 or later](https://godotengine.org/download/).
2. Clone this repository and open the project folder in Godot.
3. Open `scenes/Main.tscn` and press **F6**, or press **F5** to run the configured main scene.

No external packages are required for the game.

## Controls

| Input | Action |
| --- | --- |
| W / A / S / D | Move |
| Mouse | Look around |
| Space | Jump |
| Shift | Sprint |
| Left mouse | Break the targeted block |
| Right mouse | Place a grass block beside the targeted face |
| Escape | Release the mouse; press again to recapture |

## Current features

- Seeded terrain built from **FastNoiseLite**.
- Streamed 16 × 16 chunks around the player.
- Face-culled voxel meshes with block-specific colors and collision.
- First-person movement with sprinting, jumping, and block interaction.
- Small, data-driven block palette in `data/blocks.json`.

## Project structure

```text
data/       Block definitions and future gameplay data
docs/       Development roadmap
scenes/     Godot scenes
systems/    Player controller and gameplay systems
world/      Terrain generation, chunks, and block meshing
```

## Roadmap

See [`docs/FEATURE_CHECKLIST.md`](docs/FEATURE_CHECKLIST.md) for the prototype roadmap. Planned next steps include a usable hotbar, world persistence, richer terrain features, and a small automated validation suite.

## Development notes

This project is an experimental game prototype. Saves and edits are not persisted yet, and chunk meshes are rebuilt when a block changes. Performance and gameplay systems will continue to evolve as the prototype grows.
