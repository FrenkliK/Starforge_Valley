extends CharacterBody3D

@export var move_speed := 6.0
@export var sprint_speed := 10.0
@export var jump_velocity := 5.0
@export var mouse_sensitivity := 0.003
@export var reach_distance := 6.0

var camera: Camera3D
var gravity := ProjectSettings.get_setting("physics/3d/default_gravity")
var world: Node

func _ready() -> void:
    add_to_group("player")
    camera = $Camera3D
    Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
    world = get_tree().get_first_node_in_group("world")
    if world == null:
        world = get_parent().get_node_or_null("World")

func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventMouseMotion:
        rotate_y(-event.relative.x * mouse_sensitivity)
        camera.rotate_x(-event.relative.y * mouse_sensitivity)
        camera.rotation.x = clamp(camera.rotation.x, -1.4, 1.4)
    if event.is_action_pressed("pause_menu"):
        Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)

func _physics_process(delta: float) -> void:
    var input_dir := Vector3.ZERO
    var forward := -transform.basis.z
    var right := transform.basis.x
    if Input.is_action_pressed("move_forward"):
        input_dir += forward
    if Input.is_action_pressed("move_backward"):
        input_dir -= forward
    if Input.is_action_pressed("move_left"):
        input_dir -= right
    if Input.is_action_pressed("move_right"):
        input_dir += right
    input_dir = input_dir.normalized()
    var speed := move_speed
    if Input.is_action_pressed("sprint"):
        speed = sprint_speed
    velocity.x = input_dir.x * speed
    velocity.z = input_dir.z * speed
    if not is_on_floor():
        velocity.y -= gravity * delta
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_velocity
    move_and_slide()

    if Input.is_action_just_pressed("break_block"):
        _try_break_block()
    if Input.is_action_just_pressed("place_block"):
        _try_place_block()

func _try_break_block() -> void:
    var hit := _raycast()
    if hit.is_empty():
        return
    if world and world.has_method("set_block"):
        world.set_block(hit["position"], 0)

func _try_place_block() -> void:
    var hit := _raycast()
    if hit.is_empty():
        return
    var target := hit["position"] + hit["normal"]
    if world and world.has_method("set_block"):
        world.set_block(target, 2)

func _raycast() -> Dictionary:
    var origin := camera.global_transform.origin
    var direction := -camera.global_transform.basis.z
    var space_state := get_world_3d().direct_space_state
    var query := PhysicsRayQueryParameters3D.new()
    query.from = origin
    query.to = origin + direction * reach_distance
    query.exclude = [self]
    var result := space_state.intersect_ray(query)
    if result:
        return {
            "position": Vector3i(round(result.position.x), round(result.position.y), round(result.position.z)),
            "normal": Vector3i(result.normal)
        }
    return {}
