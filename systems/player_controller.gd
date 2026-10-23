extends CharacterBody3D

@export_group("Movement")
@export var move_speed := 6.0
@export var sprint_speed := 9.0
@export var jump_velocity := 5.5
@export var ground_acceleration := 24.0
@export var air_acceleration := 8.0
@export var mouse_sensitivity := 0.0022
@export_group("Block interaction")
@export_range(1.0, 12.0, 0.5) var reach_distance := 6.0
@export var selected_block_id := 2

@onready var camera: Camera3D = $Camera3D
var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var world: Node

func _ready() -> void:
	add_to_group("player")
	world = get_tree().get_first_node_in_group("world")
	if world == null:
		world = get_parent().get_node_or_null("World")
	_capture_mouse()

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause_menu"):
		if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
			Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
		else:
			_capture_mouse()
		get_viewport().set_input_as_handled()
		return
	if event is InputEventMouseButton and event.pressed and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
		_capture_mouse()
		return
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.relative.x * mouse_sensitivity)
		camera.rotate_x(-event.relative.y * mouse_sensitivity)
		camera.rotation.x = clamp(camera.rotation.x, deg_to_rad(-85.0), deg_to_rad(85.0))

func _physics_process(delta: float) -> void:
	var input_vector := Input.get_vector("move_left", "move_right", "move_forward", "move_backward")
	var direction := (transform.basis * Vector3(input_vector.x, 0.0, input_vector.y)).normalized()
	var speed := sprint_speed if Input.is_action_pressed("sprint") else move_speed
	var acceleration := ground_acceleration if is_on_floor() else air_acceleration
	velocity.x = move_toward(velocity.x, direction.x * speed, acceleration * delta)
	velocity.z = move_toward(velocity.z, direction.z * speed, acceleration * delta)

	if not is_on_floor():
		velocity.y -= gravity * delta
	elif Input.is_action_just_pressed("jump"):
		velocity.y = jump_velocity

	move_and_slide()
	if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		if Input.is_action_just_pressed("break_block"):
			_edit_targeted_block(false)
		elif Input.is_action_just_pressed("place_block"):
			_edit_targeted_block(true)

func _edit_targeted_block(placing: bool) -> void:
	if world == null or not world.has_method("set_block"):
		return
	var hit := _raycast()
	if hit.is_empty():
		return
	var normal: Vector3 = hit.normal
	var hit_position: Vector3 = hit.position
	var block_position := _to_block_position(hit_position - normal * 0.01)
	if placing:
		var place_position := _to_block_position(hit_position + normal * 0.51)
		if _player_overlaps_block(place_position):
			return
		world.set_block(place_position, selected_block_id)
	else:
		world.set_block(block_position, 0)

func _raycast() -> Dictionary:
	var query := PhysicsRayQueryParameters3D.create(
		camera.global_position,
		camera.global_position + -camera.global_transform.basis.z * reach_distance
	)
	query.exclude = [self]
	return get_world_3d().direct_space_state.intersect_ray(query)

func _to_block_position(position: Vector3) -> Vector3i:
	return Vector3i(floori(position.x), floori(position.y), floori(position.z))

func _player_overlaps_block(block_position: Vector3i) -> bool:
	var block := AABB(Vector3(block_position), Vector3.ONE)
	var player_bounds := AABB(global_position + Vector3(-0.3, -0.8, -0.3), Vector3(0.6, 1.6, 0.6))
	return block.intersects(player_bounds)

func _capture_mouse() -> void:
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
