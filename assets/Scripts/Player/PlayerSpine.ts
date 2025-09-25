import { _decorator, Component, sp, input, Input, EventKeyboard, KeyCode, Vec2, RigidBody2D, Node, Collider2D, Contact2DType, IPhysics2DContact, Vec3, tween } from 'cc';
import { VirtualJoystick } from "db://assets/Scripts/Player/VirtualJoystick";
import { HPBar } from "db://assets/Scripts/Player/HPBar";
import { GoblinController } from "db://assets/Scripts/Enemies/GoblinController";
import { RubyController } from "db://assets/Scripts/RubyController";
import { DropZoneController } from "db://assets/Scripts/DropZoneController"; // 🔥 THÊM: Import DropZoneController

const { ccclass, property } = _decorator;

enum PlayerState {
    Idle,
    Run,
    Attack,
    Die
}

@ccclass('PlayerSpine')
export class PlayerSpine extends Component {
    // --- Các thuộc tính cũ giữ nguyên ---
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

    @property({ type: Node, tooltip: "Node chứa Collider trigger để hút Ruby" })
    collectionArea: Node = null!;

    @property({ group: 'Ruby Collection', tooltip: "Tốc độ Ruby bay về phía người chơi" })
    rubyAttractSpeed: number = 10;

    @property({ group: 'Ruby Collection', tooltip: "Khoảng cách giữa các viên Ruby khi xếp chồng" })
    rubyStackOffset: number = 5;

    @property({ group: 'Ruby Collection', tooltip: "Vị trí của chồng Ruby so với người chơi (x, y)" })
    rubyStackPosition: Vec2 = new Vec2(-20, 50);

    private collectedRubies: Node[] = [];

    private moveDirKeyboard: Vec2 = new Vec2(0, 0);
    private moveDir: Vec2 = new Vec2(0, 0);
    private tempVec2: Vec2 = new Vec2();
    private originalScaleX: number = 1;
    private hpBar: HPBar;

    public hp: number = 100;
    private state: PlayerState = PlayerState.Idle;

    start() {
        this.originalScaleX = this.node.getScale().x;
        this.spine.setAnimation(0, "idle", true);

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);

        if (this.body) {
            this.body.fixedRotation = true;
        }

        // Lắng nghe va chạm của vùng hút Ruby
        if (this.collectionArea) {
            const collectorCollider = this.collectionArea.getComponent(Collider2D);
            if (collectorCollider) {
                collectorCollider.on(Contact2DType.BEGIN_CONTACT, this.onRubyContact, this);
            } else {
                console.error("Node 'collectionArea' cần phải có một component Collider2D.");
            }
        }

        // 🔥 THÊM: Lắng nghe va chạm của THÂN THỂ Player (để phát hiện DropZone)
        const mainCollider = this.getComponent(Collider2D);
        if (mainCollider) {
            mainCollider.on(Contact2DType.BEGIN_CONTACT, this.onBodyContact, this);
        }
    }

    // ... (Hàm onDestroy, update, và các hàm khác giữ nguyên)
    update(deltaTime: number) {
        if (this.state === PlayerState.Die || this.state === PlayerState.Attack) {
            if (this.body) this.body.linearVelocity = new Vec2(0, 0);
            this.updateRubyStack(deltaTime); // Vẫn cập nhật ruby stack khi tấn công
            return;
        }

        const enemy = this.getClosestEnemy();
        if (enemy) {
            const dist = Vec2.distance( new Vec2(this.node.worldPosition.x, this.node.worldPosition.y), new Vec2(enemy.worldPosition.x, enemy.worldPosition.y));
            if (dist <= this.attackRange) {
                this.attack(enemy);
                return;
            }
        }
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
            if (this.moveDir.x > 0) { this.node.setScale(this.originalScaleX, this.node.getScale().y, 1);
            } else if (this.moveDir.x < 0) { this.node.setScale(-this.originalScaleX, this.node.getScale().y, 1); }
        } else {
            if (this.state !== PlayerState.Idle) {
                this.state = PlayerState.Idle;
                this.spine.setAnimation(0, "idle", true);
            }
        }
        this.updateRubyStack(deltaTime);
    }

    // 🔥 THÊM: Hàm xử lý va chạm cho thân thể Player
    private onBodyContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        // Kiểm tra xem có va chạm với DropZone không
        const dropZone = otherCollider.getComponent(DropZoneController);
        if (dropZone && dropZone.targetNode) {
            this.dropOffRubies(dropZone.targetNode);
        }
    }

    // 🔥 THÊM: Hàm xử lý đặt Ruby lên bàn
    private dropOffRubies(targetTable: Node) {
        // Nếu không có ruby để đặt, hoặc đang trong quá trình đặt rồi thì không làm gì cả
        if (this.collectedRubies.length === 0) {
            return;
        }

        const rubiesToDrop = [...this.collectedRubies]; // Sao chép mảng
        this.collectedRubies = []; // Xóa mảng gốc ngay lập tức để không nhận thêm ruby

        const targetPosition = targetTable.worldPosition;

        console.log(`Bắt đầu đặt ${rubiesToDrop.length} viên Ruby...`);

        // Tạo hiệu ứng từng viên Ruby bay về phía bàn
        for (let i = 0; i < rubiesToDrop.length; i++) {
            const rubyNode = rubiesToDrop[i];
            tween(rubyNode)
                .delay(i * 0.05) // Delay một chút để tạo hiệu ứng nối đuôi nhau
                .to(0.4, { worldPosition: targetPosition }, { easing: 'quadIn' })
                .call(() => {
                    // Tại đây bạn có thể thêm logic cộng tiền, cộng điểm
                    // Ví dụ: this.gold += 10;
                    console.log("+10 gold from Ruby!");
                    rubyNode.destroy(); // Hủy viên Ruby sau khi nó bay tới nơi
                })
                .start();
        }
    }


    private onRubyContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        const rubyController = otherCollider.getComponent(RubyController);
        if (rubyController && this.collectedRubies.indexOf(otherCollider.node) === -1) {
            this.collectedRubies.push(otherCollider.node);
            otherCollider.enabled = false;
        }
    }

    private updateRubyStack(deltaTime: number) {
        if (this.collectedRubies.length === 0) return;

        const basePosition = new Vec3(this.node.worldPosition.x + this.rubyStackPosition.x, this.node.worldPosition.y + this.rubyStackPosition.y, this.node.worldPosition.z);
        for (let i = 0; i < this.collectedRubies.length; i++) {
            const rubyNode = this.collectedRubies[i];
            const targetPosition = new Vec3(basePosition.x, basePosition.y + (i * this.rubyStackOffset), basePosition.z);
            const currentPos = rubyNode.worldPosition;
            const newPos = new Vec3();
            Vec3.lerp(newPos, currentPos, targetPosition, deltaTime * this.rubyAttractSpeed);
            rubyNode.setWorldPosition(newPos);
        }
    }

    // ... (Các hàm còn lại giữ nguyên)
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
        if (triggerEnemy) {
            const enemyPos = triggerEnemy.worldPosition;
            const playerPos = this.node.worldPosition;
            if (enemyPos.x > playerPos.x) { this.node.setScale(this.originalScaleX, this.node.getScale().y, 1);
            } else { this.node.setScale(-this.originalScaleX, this.node.getScale().y, 1); }
        }
        this.spine.setAnimation(0, "attack_melee_1", false);
        const allEnemies = this.node.scene.getComponentsInChildren(GoblinController);
        const aliveEnemies = allEnemies.filter(e => !e.isDead);
        const playerPos = new Vec2(this.node.worldPosition.x, this.node.worldPosition.y);
        for (const enemyComp of aliveEnemies) {
            const enemyPos = new Vec2(enemyComp.node.worldPosition.x, enemyComp.node.worldPosition.y);
            const distance = Vec2.distance(playerPos, enemyPos);
            if (distance <= this.aoeRadius) {
                enemyComp.die();
            }
        }
        this.spine.setCompleteListener(null);
        this.spine.setCompleteListener((trackEntry) => {
            if (trackEntry.animation.name === "attack_melee_1") {
                this.state = PlayerState.Idle;
                this.spine.setAnimation(0, "idle", true);
            }
        });
    }
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