import { _decorator, Component, sp, input, Input, EventKeyboard, KeyCode, Vec2, RigidBody2D } from 'cc';
import { Joystick } from "db://assets/Scripts/Joystick";

const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
    @property(sp.Skeleton)
    spine: sp.Skeleton = null!;

    @property(RigidBody2D)
    body: RigidBody2D = null!;

    @property
    speed: number = 200;

    @property(Joystick)
    joystick: Joystick | null = null;

    private moveDirKeyboard: Vec2 = new Vec2(0, 0);
    private moveDir: Vec2 = new Vec2(0, 0);
    private originalScaleX: number = 1;

    start() {
        this.originalScaleX = this.node.getScale().x;
        this.spine.setAnimation(0, "idle", true);
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    update() {
        let dir = this.moveDirKeyboard.clone();

        if (this.joystick) {
            const joyDir = this.joystick.getDirection();
            dir = dir.add(joyDir);
        }

        if(dir.length() > 1) {
            dir = dir.normalize();
        }

        this.moveDir = dir;

        if (this.body) {
            this.body.linearVelocity = new Vec2(this.moveDir.x * this.speed, this.moveDir.y * this.speed);
        }

        if (this.moveDir.x !== 0 || this.moveDir.y !== 0) {
            if (this.spine.animation !== "run") {
                this.spine.setAnimation(0, "run", true);
            }

            if (this.moveDir.x > 0) {
                this.node.setScale(this.originalScaleX, this.node.getScale().y, 1);
            } else if (this.moveDir.x < 0) {
                this.node.setScale(-this.originalScaleX, this.node.getScale().y, 1);
            }
        } else {
            if (this.spine.animation !== "idle") {
                this.spine.setAnimation(0, "idle", true);
            }
        }
    }

    private onKeyDown(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_W: this.moveDir.y = 1; break;
            case KeyCode.KEY_S: this.moveDir.y = -1; break;
            case KeyCode.KEY_A: this.moveDir.x = -1; break;
            case KeyCode.KEY_D: this.moveDir.x = 1; break;
        }
    }

    private onKeyUp(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.KEY_S: this.moveDir.y = 0; break;
            case KeyCode.KEY_A:
            case KeyCode.KEY_D: this.moveDir.x = 0; break;
        }
    }
}
