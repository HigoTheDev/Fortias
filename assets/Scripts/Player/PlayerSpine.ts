import { _decorator, Component, sp, input, Input, EventKeyboard, KeyCode, Vec2, RigidBody2D, Node } from 'cc';
import { VirtualJoystick } from "db://assets/Scripts/Player/VirtualJoystick";
import {HPBar} from "db://assets/Scripts/Player/HPBar";
import {GoblinController} from "db://assets/Scripts/Enemies/GoblinController";

const { ccclass, property } = _decorator;

enum PlayerState {
    Idle,
    Run,
    Attack,
    Die
}

@ccclass('PlayerSpine')
export class PlayerSpine extends Component {
    @property(sp.Skeleton)
    spine: sp.Skeleton = null!;

    @property(RigidBody2D)
    body: RigidBody2D = null!;

    @property
    speed: number = 200;

    @property(VirtualJoystick)
    joystick: VirtualJoystick | null = null;

    @property(Node)
    hpBarNode: Node = null!;

    @property({ min: 1, max: 1000, tooltip: "Maximum HP" })
    maxHP: number = 100;

    @property({ tooltip: "Khoảng cách để bắt đầu tấn công" })
    attackRange: number = 80;

    @property({ tooltip: "Phạm vi tấn công lan tỏa" })
    aoeRadius: number = 150;

    @property
    public damage: number = 50;

    private moveDirKeyboard: Vec2 = new Vec2(0, 0);
    private moveDir: Vec2 = new Vec2(0, 0);
    private tempVec2: Vec2 = new Vec2();
    private originalScaleX: number = 1;
    private hpBar: HPBar;

    public hp: number = 100;
    private state: PlayerState = PlayerState.Idle;

    start() {
        // if (!this.hpBarNode) {
        //     console.error("HPBar node not assigned");
        //     return;
        // }
        //
        // this.hpBar = this.hpBarNode.getComponent(HPBar);
        // if (!this.hpBar) {
        //     console.error("HPBar component not found");
        //     return;
        // }
        //
        // this.hp = this.maxHP;
        // this.hpBar.setMaxHP(this.hp);
        this.originalScaleX = this.node.getScale().x;
        this.spine.setAnimation(0, "idle", true);

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);

        if (this.body) {
            this.body.fixedRotation = true;
        }
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    update(deltaTime: number) {
        if (this.state === PlayerState.Die || this.state === PlayerState.Attack) {
            if (this.body) this.body.linearVelocity = new Vec2(0, 0);
            return;
        }

        const enemy = this.getClosestEnemy();
        if (enemy) {
            const dist = Vec2.distance(
                new Vec2(this.node.worldPosition.x, this.node.worldPosition.y),
                new Vec2(enemy.worldPosition.x, enemy.worldPosition.y)
            );
            if (dist <= this.attackRange) {
                this.attack(enemy);
                return;
            }
        }

        // --- Di chuyển ---
        let dir = new Vec2(0, 0);
        if (this.joystick && this.joystick.isUsingJoystic) {
            dir = this.joystick.getAxis();
        } else {
            dir = this.moveDirKeyboard.clone();
        }

        if (dir.length() > 1) dir = dir.normalize();
        this.moveDir = dir;

        if (this.body) {
            this.tempVec2.set(this.moveDir.x * this.speed, this.moveDir.y * this.speed);
            this.body.linearVelocity = this.tempVec2;
        }

        if (this.moveDir.x !== 0 || this.moveDir.y !== 0) {
            if (this.state !== PlayerState.Run) {
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

    private getClosestEnemy(): Node | null {
        const allEnemies = this.node.scene.getComponentsInChildren(GoblinController);
        const aliveEnemies = allEnemies.filter(enemy => !enemy.isDead);

        if (aliveEnemies.length === 0) return null;

        let closest: Node = null;
        let minDist = Infinity;
        const playerPos = new Vec2(this.node.worldPosition.x, this.node.worldPosition.y);

        for (const enemy of aliveEnemies) {
            const enemyPos = new Vec2(enemy.node.worldPosition.x, enemy.node.worldPosition.y);
            const dist = Vec2.distance(playerPos, enemyPos);

            if (dist < minDist) {
                minDist = dist;
                closest = enemy.node;
            }
        }
        return closest;
    }


    public attack(triggerEnemy: Node | null) {
        if (this.state === PlayerState.Die) return;

        this.state = PlayerState.Attack;
        if (this.body) this.body.linearVelocity = new Vec2(0, 0);

        // Hướng mặt về phía kẻ địch kích hoạt đòn đánh (nếu có)
        if (triggerEnemy) {
            const enemyPos = triggerEnemy.worldPosition;
            const playerPos = this.node.worldPosition;
            if (enemyPos.x > playerPos.x) {
                this.node.setScale(this.originalScaleX, this.node.getScale().y, 1);
            } else {
                this.node.setScale(-this.originalScaleX, this.node.getScale().y, 1);
            }
        }

        this.spine.setAnimation(0, "attack_melee_1", false);

        // --- Logic tấn công lan (AoE) ---
        // 1. Lấy danh sách tất cả kẻ địch còn sống
        const allEnemies = this.node.scene.getComponentsInChildren(GoblinController);
        const aliveEnemies = allEnemies.filter(e => !e.isDead);

        const playerPos = new Vec2(this.node.worldPosition.x, this.node.worldPosition.y);

        // 2. Duyệt qua từng kẻ địch và kiểm tra khoảng cách
        for (const enemyComp of aliveEnemies) {
            const enemyPos = new Vec2(enemyComp.node.worldPosition.x, enemyComp.node.worldPosition.y);
            const distance = Vec2.distance(playerPos, enemyPos);

            // 3. Nếu kẻ địch nằm trong phạm vi tấn công lan, ra lệnh cho nó chết
            if (distance <= this.aoeRadius) {
                enemyComp.die();
            }
        }
        // --- Kết thúc logic AoE ---

        this.spine.setCompleteListener(null);
        this.spine.setCompleteListener((trackEntry) => {
            if (trackEntry.animation.name === "attack_melee_1") {
                this.state = PlayerState.Idle;
                this.spine.setAnimation(0, "idle", true);
            }
        });
    }

    // Các hàm die(), takeDamage(), onKeyDown(), onKeyUp() giữ nguyên
    // ...
    public die() {
        if (this.state === PlayerState.Die) return;
        this.state = PlayerState.Die;
        this.hp = 0;

        if (this.body) this.body.linearVelocity = new Vec2(0, 0);

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
        if (this.hp <= 0) this.die();
    }

    private onKeyDown(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_W: this.moveDirKeyboard.y = 1; break;
            case KeyCode.KEY_S: this.moveDirKeyboard.y = -1; break;
            case KeyCode.KEY_A: this.moveDirKeyboard.x = -1; break;
            case KeyCode.KEY_D: this.moveDirKeyboard.x = 1; break;
            case KeyCode.SPACE: this.attack(this.getClosestEnemy()); break;
            case KeyCode.KEY_P: this.die(); break;
            case KeyCode.KEY_L: this.takeDamage(50); break;
        }
    }

    private onKeyUp(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_W: if (this.moveDirKeyboard.y > 0) this.moveDirKeyboard.y = 0; break;
            case KeyCode.KEY_S: if (this.moveDirKeyboard.y < 0) this.moveDirKeyboard.y = 0; break;
            case KeyCode.KEY_A: if (this.moveDirKeyboard.x < 0) this.moveDirKeyboard.x = 0; break;
            case KeyCode.KEY_D: if (this.moveDirKeyboard.x > 0) this.moveDirKeyboard.x = 0; break;
        }
    }
}