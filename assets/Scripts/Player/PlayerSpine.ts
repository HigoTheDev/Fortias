// File: PlayerSpine.ts (Hoàn chỉnh)
import { _decorator, Component, sp, input, Input, EventKeyboard, KeyCode, Vec2, RigidBody2D, Node, Collider2D, Contact2DType, IPhysics2DContact, Vec3, tween } from 'cc';
import { VirtualJoystick } from "db://assets/Scripts/Player/VirtualJoystick";
import { HPBar } from "db://assets/Scripts/Player/HPBar";
import { GoblinController } from "db://assets/Scripts/Enemies/GoblinController";
import { RubyController } from "db://assets/Scripts/RubyController";
import { DropZoneController } from "db://assets/Scripts/DropZoneController";
import { GameManager } from "db://assets/Scripts/GameManager";

const { ccclass, property } = _decorator;

enum PlayerState {
    Idle,
    Run,
    Attack,
    Die
}

@ccclass('PlayerSpine')
export class PlayerSpine extends Component {
    // --- Properties ---
    @property(sp.Skeleton) spine: sp.Skeleton = null!;
    @property(RigidBody2D) body: RigidBody2D = null!;
    @property speed: number = 200;
    @property(VirtualJoystick) joystick: VirtualJoystick | null = null;
    @property(Node) hpBarNode: Node = null!;
    @property({ min: 1, max: 1000 }) maxHP: number = 100;
    @property attackRange: number = 80;
    @property aoeRadius: number = 150;
    @property public damage: number = 50;
    @property({ group: 'Ruby Collection', tooltip: "Bán kính hút Ruby." }) collectionRadius: number = 250;
    @property({ group: 'Ruby Collection', tooltip: "Tốc độ Ruby bay theo Player." }) rubyAttractSpeed: number = 10;
    @property({ group: 'Ruby Collection', tooltip: "Khoảng cách dọc giữa các viên Ruby." }) rubyStackOffset: number = 8;
    @property({ group: 'Ruby Collection', tooltip: "Vị trí của chồng Ruby so với Player (x, y)." }) rubyStackPosition: Vec2 = new Vec2(-20, 60);
    @property({ group: 'Coin Collection', tooltip: "Tốc độ Coin bay theo Player." }) coinAttractSpeed: number = 10;
    @property({ group: 'Coin Collection', tooltip: "Khoảng cách dọc giữa các đồng xu." }) coinStackOffset: number = 8;
    @property({ group: 'Coin Collection', tooltip: "Vị trí của chồng Coin so với Player (x, y)." }) coinStackPosition: Vec2 = new Vec2(-20, 0);

    // --- Private Variables ---
    private collectedRubies: Node[] = [];
    private collectedCoins: Node[] = [];
    private moveDirKeyboard: Vec2 = new Vec2(0, 0);
    private moveDir: Vec2 = new Vec2(0, 0);
    private tempVec2: Vec2 = new Vec2();
    private originalScaleX: number = 1;
    private hpBar: HPBar;
    public hp: number = 100;
    private state: PlayerState = PlayerState.Idle;
    private activeDropZone: DropZoneController | null = null;

    start() {
        this.originalScaleX = this.node.getScale().x;
        this.spine.setAnimation(0, "idle", true);
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        if (this.body) { this.body.fixedRotation = true; }
        const mainCollider = this.getComponent(Collider2D);
        if (mainCollider) {
            mainCollider.on(Contact2DType.BEGIN_CONTACT, this.onBodyBeginContact, this);
            mainCollider.on(Contact2DType.END_CONTACT, this.onBodyEndContact, this);
        }
    }

    update(deltaTime: number) {
        if (this.state === PlayerState.Die) {
            if (this.body) this.body.linearVelocity = new Vec2(0, 0);
            return;
        }
        this.checkForNearbyRubies();
        this.updateRubyStack(deltaTime);
        this.updateCoinStack(deltaTime);
        if (this.state !== PlayerState.Attack) {
            const enemy = this.getClosestEnemy();
            if (enemy) {
                const dist = Vec2.distance(new Vec2(this.node.worldPosition.x, this.node.worldPosition.y), new Vec2(enemy.worldPosition.x, enemy.worldPosition.y));
                if (dist <= this.attackRange) {
                    this.attack(enemy);
                }
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
        if (this.state !== PlayerState.Attack) {
            if (this.moveDir.length() > 0) {
                if (this.state !== PlayerState.Run) {
                    this.state = PlayerState.Run;
                    this.spine.setAnimation(0, "run", true);
                }
            } else {
                if (this.state !== PlayerState.Idle) {
                    this.state = PlayerState.Idle;
                    this.spine.setAnimation(0, "idle", true);
                }
            }
        }
        if (this.moveDir.x > 0) {
            this.node.setScale(this.originalScaleX, this.node.getScale().y, 1);
        } else if (this.moveDir.x < 0) {
            this.node.setScale(-this.originalScaleX, this.node.getScale().y, 1);
        }
    }

    public receiveCoin(coinNode: Node) {
        this.collectedCoins.push(coinNode);
        GameManager.instance.addCoins(1);
    }

    private updateCoinStack(deltaTime: number) {
        if (this.collectedCoins.length === 0) return;
        const basePosition = new Vec3(this.node.worldPosition.x + this.coinStackPosition.x, this.node.worldPosition.y + this.coinStackPosition.y, this.node.worldPosition.z);
        for (let i = 0; i < this.collectedCoins.length; i++) {
            const coinNode = this.collectedCoins[i];
            const targetPosition = new Vec3(basePosition.x, basePosition.y + (i * this.coinStackOffset), basePosition.z);

            const distanceToTarget = Vec3.distance(coinNode.worldPosition, targetPosition);

            if (distanceToTarget > 1) {
                const currentPos = coinNode.worldPosition;
                const newPos = new Vec3();
                Vec3.lerp(newPos, currentPos, targetPosition, deltaTime * this.coinAttractSpeed);
                coinNode.setWorldPosition(newPos);
            }
            else {
                coinNode.setWorldPosition(targetPosition);
            }
        }
    }

    private onBodyBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        const dropZone = otherCollider.getComponent(DropZoneController);
        if (dropZone) {
            this.activeDropZone = dropZone;
            this.dropOffRubies(dropZone);
        }
    }

    private onBodyEndContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        const dropZone = otherCollider.getComponent(DropZoneController);
        if (dropZone && dropZone === this.activeDropZone) {
            this.activeDropZone = null;
        }
    }

    private updateRubyStack(deltaTime: number) {
        if (this.collectedRubies.length === 0 || this.activeDropZone) { return; }
        const basePosition = new Vec3(this.node.worldPosition.x + this.rubyStackPosition.x, this.node.worldPosition.y + this.rubyStackPosition.y, this.node.worldPosition.z);
        for (let i = 0; i < this.collectedRubies.length; i++) {
            const rubyNode = this.collectedRubies[i];
            const targetPosition = new Vec3(basePosition.x, basePosition.y + (i * this.rubyStackOffset), basePosition.z);

            const distanceToTarget = Vec3.distance(rubyNode.worldPosition, targetPosition);

            if (distanceToTarget > 1) {
                const currentPos = rubyNode.worldPosition;
                const newPos = new Vec3();
                Vec3.lerp(newPos, currentPos, targetPosition, deltaTime * this.rubyAttractSpeed);
                rubyNode.setWorldPosition(newPos);
            }
            else {
                rubyNode.setWorldPosition(targetPosition);
            }
        }
    }

    public dropOffRubies(dropZone: DropZoneController) {
        if (this.collectedRubies.length === 0) {
            return;
        }
        const rubiesToDrop = [...this.collectedRubies];
        GameManager.instance.removeRubies(rubiesToDrop.length);
        this.collectedRubies = [];
        let dropIndex = 0;
        while (rubiesToDrop.length > 0) {
            const rubyNode = rubiesToDrop.pop();
            if (!rubyNode) continue;
            const rubyScript = rubyNode.getComponent(RubyController);
            if (rubyScript) {
                rubyScript.enabled = false;
            }
            const finalWorldPos = dropZone.getNextPlacementPosition();
            tween(rubyNode)
                .delay(dropIndex * 0.08)
                .to(0.4, { worldPosition: finalWorldPos }, { easing: 'quadIn' })
                .call(() => {
                    dropZone.registerPlacedRuby(rubyNode);
                })
                .start();
            dropIndex++;
        }
    }

    private checkForNearbyRubies() {
        const allRubies = this.node.scene.getComponentsInChildren(RubyController);
        if (allRubies.length === 0) return;
        const playerPos = new Vec2(this.node.worldPosition.x, this.node.worldPosition.y);
        for (const ruby of allRubies) {
            if (ruby.isCollected) {
                continue;
            }
            const rubyPos = new Vec2(ruby.node.worldPosition.x, ruby.node.worldPosition.y);
            const distance = Vec2.distance(playerPos, rubyPos);
            if (distance <= this.collectionRadius) {
                ruby.isCollected = true;
                this.collectedRubies.push(ruby.node);
                GameManager.instance.addRubies(1);
                const rubyBody = ruby.getComponent(RigidBody2D);
                if (rubyBody) {
                    rubyBody.enabled = false;
                }
            }
        }
    }

    // ✅ HÀM MỚI ĐƯỢC THÊM VÀO ĐÂY
    /**
     * Lấy và trả về node của đồng xu trên cùng trong chồng xu.
     * Thao tác này sẽ xóa đồng xu khỏi chồng xu của Player.
     * @returns Node của đồng xu, hoặc null nếu không còn xu.
     */
    public takeTopCoin(): Node | null {
        if (this.collectedCoins.length > 0) {
            // pop() sẽ lấy và xóa phần tử cuối cùng của mảng (đồng xu trên cùng)
            const coinNode = this.collectedCoins.pop();
            return coinNode;
        }
        return null;
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
        if (this.state === PlayerState.Die || this.state === PlayerState.Attack) { return; }
        this.state = PlayerState.Attack;
        if (triggerEnemy) {
            const enemyPos = triggerEnemy.worldPosition;
            const playerPos = this.node.worldPosition;
            if (enemyPos.x > playerPos.x) { this.node.setScale(this.originalScaleX, this.node.getScale().y, 1); } else { this.node.setScale(-this.originalScaleX, this.node.getScale().y, 1); }
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