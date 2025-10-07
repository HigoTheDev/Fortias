import { _decorator, Component, Node, Vec3, sp, Collider2D, Contact2DType, IPhysics2DContact, Color, Prefab, instantiate } from 'cc';
import { Fence } from "db://assets/Scripts/Props/Fence";
import { DoorController } from "db://assets/Scripts/Props/DoorController";
import { PlayerSpine } from "db://assets/Scripts/Player/PlayerSpine";

const { ccclass, property } = _decorator;

@ccclass('GoblinController')
export class GoblinController extends Component {

    private playerNode: Node = null;
    private targetFenceScript: Fence = null;
    private targetDoorScript: DoorController = null;

    @property
    private moveSpeed: number = 50;
    @property
    private damage: number = 20;
    @property(sp.Skeleton)
    spine: sp.Skeleton = null!;
    @property({ type: Prefab })
    public rubyPrefab: Prefab = null!;

    // ✅ THÊM: Trạng thái kích hoạt, mặc định là false
    private isActivated: boolean = false;
    private isMoving: boolean = true;
    private isAttacking: boolean = false;
    public isDead: boolean = false;
    private originalScale: Vec3 = new Vec3(1, 1, 1);

    start() {
        if (!this.spine) {
            this.spine = this.getComponentInChildren(sp.Skeleton)!;
        }
        this.originalScale = this.node.getScale();

        const playerComponent = this.node.scene.getComponentInChildren(PlayerSpine);
        if (playerComponent) {
            this.playerNode = playerComponent.node;
        } else {
            console.error("Goblin không thể tìm thấy Player trong Scene!");
        }

        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        }

        // ✅ THAY ĐỔI: Bắt đầu với animation idle thay vì chạy
        this.spine.setAnimation(0, "idle", true);
    }

    update(deltaTime: number) {
        // ✅ THAY ĐỔI: Thêm điều kiện !this.isActivated để ngăn mọi hành động
        if (this.isDead || this.isAttacking || !this.isActivated) return;

        if (this.isMoving && this.playerNode) {
            const direction = new Vec3();
            Vec3.subtract(direction, this.playerNode.worldPosition, this.node.worldPosition);

            if (direction.x > 0) {
                this.node.setScale(this.originalScale);
            } else if (direction.x < 0) {
                this.node.setScale(new Vec3(-this.originalScale.x, this.originalScale.y, this.originalScale.z));
            }
            direction.normalize();
            this.node.translate(direction.multiplyScalar(this.moveSpeed * deltaTime));
        }

        this.setAnimation();
    }

    // ✅ THÊM: Hàm này sẽ được EnemySpawner gọi khi người chơi click chuột
    public activate() {
        if (this.isDead) return;
        this.isActivated = true;
        this.setAnimation();
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        // Chỉ tấn công nếu đã được kích hoạt
        if (!this.isActivated || this.isDead || this.isAttacking) return;

        const fenceScript = otherCollider.node.getComponent(Fence);
        if (fenceScript) {
            this.isMoving = false;
            this.targetFenceScript = fenceScript;
            this.startAttackCycle();
            return;
        }

        if (otherCollider.node.name === 'Door_obj') {
            const doorScript = otherCollider.node.parent.getComponent(DoorController);
            if (doorScript) {
                this.isMoving = false;
                this.targetDoorScript = doorScript;
                this.startAttackCycle();
                return;
            }
        }
    }

    onEndContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (this.isDead) return;

        const targetNode = otherCollider.node;
        if (targetNode.getComponent(Fence) || targetNode.getComponent(DoorController)) {
            this.isMoving = true;
            this.isAttacking = false;
            this.targetFenceScript = null;
            this.targetDoorScript = null;
            this.unscheduleAllCallbacks();
            this.setAnimation();
        }
    }

    startAttackCycle() {
        // ... (Nội dung hàm này giữ nguyên không đổi)
        if ((!this.targetFenceScript || !this.targetFenceScript.isValid) &&
            (!this.targetDoorScript || !this.targetDoorScript.isValid))
        {
            this.isAttacking = false;
            this.isMoving = true;
            this.setAnimation();
            return;
        }

        this.isAttacking = true;
        this.spine.setAnimation(0, "attack_melee_1", false);

        this.scheduleOnce(() => {
            if (this.isAttacking && !this.isDead) {
                if (this.targetFenceScript?.isValid) {
                    this.targetFenceScript.takeDamage(this.damage);
                } else if (this.targetDoorScript?.isValid) {
                    this.targetDoorScript.takeDamage(this.damage);
                }
            }
        }, 0.3);

        this.spine.setCompleteListener(() => {
            if (this.isDead || !this.isAttacking) return;

            this.spine.setAnimation(0, "idle", true);
            this.scheduleOnce(() => {
                if (!this.isDead && this.isAttacking) {
                    this.startAttackCycle();
                }
            }, 0.2);
        });
    }

    public die() {
        // ... (Nội dung hàm này giữ nguyên không đổi)
        if (this.isDead) return;
        this.isDead = true;
        this.isMoving = false;
        this.isAttacking = false;
        this.unscheduleAllCallbacks();

        if (this.rubyPrefab) {
            const rubyNode = instantiate(this.rubyPrefab);
            this.node.parent.addChild(rubyNode);
            rubyNode.setWorldPosition(this.node.worldPosition);
        } else {
            console.warn("Chưa gán Ruby Prefab cho GoblinController!");
        }

        this.spine.color = Color.RED;
        this.scheduleOnce(() => {
            if(this.spine) this.spine.color = Color.WHITE;
        }, 0.1);


        this.spine.setAnimation(0, "die", false);
        this.spine.setCompleteListener((trackEntry) => {
            if (trackEntry.animation.name === "die") {
                this.node.destroy();
            }
        });
    }

    setAnimation() {
        if (this.isDead || this.isAttacking) return;

        if (this.isActivated && this.isMoving) {
            if (this.spine.getCurrent(0)?.animation?.name !== "run") {
                this.spine.setAnimation(0, "run", true);
            }
        } else {
            if (this.spine.getCurrent(0)?.animation?.name !== "idle") {
                this.spine.setAnimation(0, "idle", true);
            }
        }
    }
}