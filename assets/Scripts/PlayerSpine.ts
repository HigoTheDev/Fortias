import { _decorator, Component, sp, input, Input, EventKeyboard, KeyCode, Vec2, RigidBody2D, Node } from 'cc';
import { Joystick } from "db://assets/Scripts/Joystick";
import { HPBar } from "db://assets/Scripts/HPBar";
const { ccclass, property } = _decorator;

enum PlayerState {
    Idle,
    Run,
    Attack,
    Die
}

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

    @property(Node)
    hpBarNode: Node = null!;

    private moveDirKeyboard: Vec2 = new Vec2(0, 0);
    private moveDir: Vec2 = new Vec2(0, 0);
    private originalScaleX: number = 1;
    private hpBar: HPBar;

    public hp: number = 100;
    private state: PlayerState = PlayerState.Idle;

    start() {
        this.hpBar = this.hpBarNode.getComponent(HPBar)!;
        this.hpBar.setMaxHP(this.hp);
        this.originalScaleX = this.node.getScale().x;
        this.spine.setAnimation(0, "idle", true);
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    update() {
        if(this.body){
            this.body.fixedRotation = true;
        }
        if (this.state == PlayerState.Die) {
            if (this.body) this.body.linearVelocity = new Vec2(0, 0);
            return;
        }

        if (this.state == PlayerState.Attack) {
            if (this.body) this.body.linearVelocity = new Vec2(0, 0);
            return;
        }

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
                this.state = PlayerState.Run;
                this.spine.setAnimation(0, "run", true);
            }

            if (this.moveDir.x > 0) {
                this.node.setScale(this.originalScaleX, this.node.getScale().y, 1);
            } else if (this.moveDir.x < 0) {
                this.node.setScale(-this.originalScaleX, this.node.getScale().y, 1);
            }
        } else {
            if (this.state !== PlayerState.Idle) {
                this.state = PlayerState.Idle;
                this.spine.setAnimation(0, "idle", true);
            }
        }
    }

    public attack() {
        if (this.state === PlayerState.Die) return;
        this.state = PlayerState.Attack;
        this.spine.setAnimation(0, "attack_melee_1", true);

        this.spine.setCompleteListener((trackEntry) => {
            if (trackEntry.animation.name === "attack_melee_1") {
                this.state = PlayerState.Idle;
                this.spine.setAnimation(0, "idle", true);
            }
        });
    }

    public die(){
        if (this.state === PlayerState.Die) return;
        this.state = PlayerState.Die;
        this.hp = 0;

        if (this.body) {
            this.body.linearVelocity = new Vec2(0, 0);
        }

        this.spine.setAnimation(0, "die", false);

        this.spine.setCompleteListener((trackEntry) => {
            if (trackEntry.animation.name === "die") {
                this.node.destroy();
            }
        });
    }

    public takeDamage(dmg: number) {
        if (this.state === PlayerState.Die) return;
        this.hp -= dmg;
        this.hp = Math.max(0, this.hp);
        this.hpBar.setHP(this.hp);

        if (this.hp <= 0) {
            this.die();
        }
    }



    private onKeyDown(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_W: this.moveDirKeyboard.y = 1; break;
            case KeyCode.KEY_S: this.moveDirKeyboard.y = -1; break;
            case KeyCode.KEY_A: this.moveDirKeyboard.x = -1; break;
            case KeyCode.KEY_D: this.moveDirKeyboard.x = 1; break;
            case KeyCode.SPACE: this.attack(); break;
            case KeyCode.KEY_P: this.die(); break;
            case KeyCode.KEY_L: this.takeDamage(50);
        }
    }

    private onKeyUp(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.KEY_S: this.moveDirKeyboard.y = 0; break;
            case KeyCode.KEY_A:
            case KeyCode.KEY_D: this.moveDirKeyboard.x = 0; break;
        }
    }
}
