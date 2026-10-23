# Development roadmap

Starforge Valley is an early, playable systems prototype. This checklist reflects the current scope; unchecked items are plans, not completed features.

## Playable prototype

- [x] Seeded procedural terrain using FastNoiseLite.
- [x] Stream chunks around the player.
- [x] Build voxel meshes with hidden interior faces removed.
- [x] Add collision for generated terrain.
- [x] First-person movement, mouse look, jumping, and sprinting.
- [x] Break and place blocks with a camera raycast.
- [x] Basic lighting, reticle, and controls HUD.
- [ ] Rebuild adjacent chunk faces cleanly at chunk borders.
- [ ] Add a small automated validation suite for terrain and block coordinates.

## Next up

- [ ] Hotbar and block selection.
- [ ] Save/load world seed, player position, and edited block deltas.
- [ ] Terrain variety: trees, caves, ore deposits, and more coherent shorelines.
- [ ] Options menu, input remapping, and accessibility settings.
- [ ] Profile chunk generation and rebuilds; move expensive work off the main frame where practical.

## Later ideas

- [ ] Biomes and points of interest.
- [ ] Inventory, crafting, and tool progression.
- [ ] Health, survival needs, and creatures.
- [ ] Day/night cycle and weather.
- [ ] Mod-friendly data definitions and world-generation settings.
