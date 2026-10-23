extends Node3D

const CHUNK_SIZE := Vector3i(16, 64, 16)
const BLOCK_AIR := 0

@export_range(1, 6, 1) var render_distance := 2
@export var world_seed := 1337

var blocks_data := {}
var chunks := {}
var noise := FastNoiseLite.new()
var player_ref: Node3D
var last_player_chunk := Vector3i(2147483647, 0, 2147483647)

func _ready() -> void:
    add_to_group("world")
    blocks_data = _load_block_data()
    noise.seed = world_seed
    noise.noise_type = FastNoiseLite.TYPE_SIMPLEX
    noise.frequency = 0.015
    noise.fractal_type = FastNoiseLite.FRACTAL_FBM
    noise.fractal_octaves = 4
    noise.fractal_lacunarity = 2.0
    noise.fractal_gain = 0.45
    player_ref = get_tree().get_first_node_in_group("player")
    if player_ref == null:
        player_ref = get_parent().get_node_or_null("Player")
    _refresh_chunks(true)

func _process(_delta: float) -> void:
    _refresh_chunks(false)

func get_block(world_pos: Vector3i) -> int:
    var chunk_coord := _world_to_chunk(Vector3(world_pos))
    var chunk := chunks.get(chunk_coord)
    if chunk == null:
        return BLOCK_AIR
    return chunk.get_block(world_pos)

func set_block(world_pos: Vector3i, block_id: int) -> void:
    var chunk_coord := _world_to_chunk(Vector3(world_pos))
    var chunk := chunks.get(chunk_coord)
    if chunk == null:
        return
    chunk.set_block(world_pos, block_id)

func _refresh_chunks(force: bool) -> void:
    if player_ref == null:
        return
    var player_chunk := _world_to_chunk(player_ref.global_position)
    if not force and player_chunk == last_player_chunk:
        return
    last_player_chunk = player_chunk
    for x in range(player_chunk.x - render_distance, player_chunk.x + render_distance + 1):
        for z in range(player_chunk.z - render_distance, player_chunk.z + render_distance + 1):
            var key := Vector3i(x, 0, z)
            if not chunks.has(key):
                _spawn_chunk(key)
    if force:
        return
    var to_remove := []
    for key in chunks.keys():
        if abs(key.x - player_chunk.x) > render_distance + 1 or abs(key.z - player_chunk.z) > render_distance + 1:
            to_remove.append(key)
    for key in to_remove:
        chunks[key].queue_free()
        chunks.erase(key)

func _spawn_chunk(chunk_coord: Vector3i) -> void:
    var chunk := Chunk.new()
    chunk.chunk_coord = chunk_coord
    chunk.chunk_size = CHUNK_SIZE
    chunk.blocks_data = blocks_data
    chunk.noise = noise
    chunk.generate()
    add_child(chunk)
    chunks[chunk_coord] = chunk

func _world_to_chunk(world_pos: Vector3) -> Vector3i:
    return Vector3i(floor(world_pos.x / CHUNK_SIZE.x), 0, floor(world_pos.z / CHUNK_SIZE.z))

func _load_block_data() -> Dictionary:
    var file := FileAccess.open("res://data/blocks.json", FileAccess.READ)
    if file == null:
        return {}
    var data := JSON.parse_string(file.get_as_text())
    if typeof(data) != TYPE_DICTIONARY:
        return {}
    return data

class Chunk:
    extends Node3D

    var chunk_coord := Vector3i.ZERO
    var chunk_size := Vector3i(16, 64, 16)
    var blocks := []
    var blocks_data := {}
    var noise: FastNoiseLite
    var mesh_instance: MeshInstance3D
    var collider: StaticBody3D

    func generate() -> void:
        blocks.resize(chunk_size.x * chunk_size.y * chunk_size.z)
        blocks.fill(BLOCK_AIR)
        _generate_blocks()
        _build_mesh()

    func _generate_blocks() -> void:
        for x in range(chunk_size.x):
            for z in range(chunk_size.z):
                var world_x := chunk_coord.x * chunk_size.x + x
                var world_z := chunk_coord.z * chunk_size.z + z
                var height := clampi(int(20 + noise.get_noise_2d(world_x, world_z) * 13.0), 4, chunk_size.y - 2)
                for y in range(height + 1):
                    var block_id := 4 # stone
                    if y == height:
                        block_id = 2 # grass
                    elif y >= height - 3:
                        block_id = 3 # loam
                    blocks[_index(x, y, z)] = block_id
                if height < 10:
                    for y in range(height + 1, 11):
                        blocks[_index(x, y, z)] = 6 # water

    func _build_mesh() -> void:
        if mesh_instance:
            mesh_instance.queue_free()
        if collider:
            collider.queue_free()
        var mesh := ArrayMesh.new()
        var vertices := PackedVector3Array()
        var normals := PackedVector3Array()
        var colors := PackedColorArray()
        var indices := PackedInt32Array()
        var index_offset := 0
        for x in range(chunk_size.x):
            for y in range(chunk_size.y):
                for z in range(chunk_size.z):
                    var block_id := blocks[_index(x, y, z)]
                    if block_id == BLOCK_AIR:
                        continue
                    var block_color := _block_color(block_id)
                    var pos := Vector3(x, y, z)
                    for face in _faces():
                        var neighbor := Vector3i(x, y, z) + face[0]
                        if _is_air(neighbor):
                            var face_vertices := face[1]
                            var normal := face[2]
                            for v in face_vertices:
                                vertices.append(pos + v)
                                normals.append(normal)
                                colors.append(block_color)
                            indices.append_array([index_offset, index_offset + 1, index_offset + 2, index_offset, index_offset + 2, index_offset + 3])
                            index_offset += 4
        var arrays := []
        arrays.resize(Mesh.ARRAY_MAX)
        arrays[Mesh.ARRAY_VERTEX] = vertices
        arrays[Mesh.ARRAY_NORMAL] = normals
        arrays[Mesh.ARRAY_COLOR] = colors
        arrays[Mesh.ARRAY_INDEX] = indices
        if vertices.is_empty():
            mesh_instance = MeshInstance3D.new()
            mesh_instance.position = Vector3(chunk_coord.x * chunk_size.x, 0, chunk_coord.z * chunk_size.z)
            add_child(mesh_instance)
            return
        mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
        mesh_instance = MeshInstance3D.new()
        mesh_instance.mesh = mesh
        var material := StandardMaterial3D.new()
        material.vertex_color_use_as_albedo = true
        material.roughness = 1.0
        mesh_instance.material_override = material
        mesh_instance.position = Vector3(chunk_coord.x * chunk_size.x, 0, chunk_coord.z * chunk_size.z)
        add_child(mesh_instance)
        if mesh.get_surface_count() > 0:
            collider = StaticBody3D.new()
            var shape := mesh.create_trimesh_shape()
            var collision := CollisionShape3D.new()
            collision.shape = shape
            collider.add_child(collision)
            collider.position = mesh_instance.position
            add_child(collider)

    func _faces() -> Array:
        return [
            [Vector3i(1, 0, 0), [Vector3(1, 0, 0), Vector3(1, 1, 0), Vector3(1, 1, 1), Vector3(1, 0, 1)], Vector3(1, 0, 0)],
            [Vector3i(-1, 0, 0), [Vector3(0, 0, 1), Vector3(0, 1, 1), Vector3(0, 1, 0), Vector3(0, 0, 0)], Vector3(-1, 0, 0)],
            [Vector3i(0, 1, 0), [Vector3(0, 1, 1), Vector3(1, 1, 1), Vector3(1, 1, 0), Vector3(0, 1, 0)], Vector3(0, 1, 0)],
            [Vector3i(0, -1, 0), [Vector3(0, 0, 0), Vector3(1, 0, 0), Vector3(1, 0, 1), Vector3(0, 0, 1)], Vector3(0, -1, 0)],
            [Vector3i(0, 0, 1), [Vector3(1, 0, 1), Vector3(1, 1, 1), Vector3(0, 1, 1), Vector3(0, 0, 1)], Vector3(0, 0, 1)],
            [Vector3i(0, 0, -1), [Vector3(0, 0, 0), Vector3(0, 1, 0), Vector3(1, 1, 0), Vector3(1, 0, 0)], Vector3(0, 0, -1)]
        ]

    func _is_air(pos: Vector3i) -> bool:
        if pos.x < 0 or pos.y < 0 or pos.z < 0:
            return true
        if pos.x >= chunk_size.x or pos.y >= chunk_size.y or pos.z >= chunk_size.z:
            return true
        return blocks[_index(pos.x, pos.y, pos.z)] == BLOCK_AIR

    func _index(x: int, y: int, z: int) -> int:
        return x + chunk_size.x * (y + chunk_size.y * z)

    func _block_color(block_id: int) -> Color:
        for key in blocks_data.keys():
            var entry := blocks_data[key]
            if entry.get("id", -1) == block_id:
                return Color(entry.get("color", "#ffffff"))
        return Color(0.8, 0.8, 0.8)

    func get_block(world_pos: Vector3i) -> int:
        var local := world_pos - Vector3i(chunk_coord.x * chunk_size.x, 0, chunk_coord.z * chunk_size.z)
        if local.x < 0 or local.y < 0 or local.z < 0:
            return BLOCK_AIR
        if local.x >= chunk_size.x or local.y >= chunk_size.y or local.z >= chunk_size.z:
            return BLOCK_AIR
        return blocks[_index(local.x, local.y, local.z)]

    func set_block(world_pos: Vector3i, block_id: int) -> void:
        var local := world_pos - Vector3i(chunk_coord.x * chunk_size.x, 0, chunk_coord.z * chunk_size.z)
        if local.x < 0 or local.y < 0 or local.z < 0:
            return
        if local.x >= chunk_size.x or local.y >= chunk_size.y or local.z >= chunk_size.z:
            return
        blocks[_index(local.x, local.y, local.z)] = block_id
        _build_mesh()
