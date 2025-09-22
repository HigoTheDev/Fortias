// GoblinController.ts

import { _decorator, Component, Node, Vec3, sp, Collider2D, Contact2DType, IPhysics2DContact, Color } from 'cc';
import { PlayerSpine } from './PlayerSpine';
import { Fence } from './Fence';
import { DoorController } from './DoorController'; // 🔥 THÊM: Import DoorController

const { ccclass, property } = _decorator;

@ccclass('GoblinController')
export class GoblinController extends Component {

    private playerNode: Node = null;
    private targetFenceScript: Fence = null;
    private targetDoorScript: DoorController = null; // 🔥 THÊM: Biến để lưu mục tiêu là Cửa

    @property
    private moveSpeed: number = 50;

    @property
    private damage: number = 20;

    @property(sp.Skeleton)
    spine: sp.Skeleton = null!;

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
            this.isMoving = false;
        }

        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        }

        this.setAnimation();
    }

    update(deltaTime: number) {
        // Nếu đang chết hoặc tấn công thì không di chuyển
        if (this.isDead || this.isAttacking) return;

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

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (this.isDead || this.isAttacking) return;

        // 🔥 CHỈNH SỬA: Kiểm tra va chạm với cả Hàng rào (Fence) và Cửa (Door)

        // 1. Ưu tiên kiểm tra Hàng rào
        const fenceScript = otherCollider.node.getComponent(Fence);
        if (fenceScript) {
            this.isMoving = false;
            this.targetFenceScript = fenceScript;
            this.startAttackCycle();
            return;
        }

        // 2. Nếu không phải hàng rào, kiểm tra Cửa
        const doorScript = otherCollider.node.getComponent(DoorController);
        if (doorScript) {
            this.isMoving = false;
            this.targetDoorScript = doorScript;
            this.startAttackCycle();
        }
    }

    onEndContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (this.isDead) return;

        // 🔥 CHỈNH SỬA: Khi kết thúc va chạm, cho phép di chuyển trở lại
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
        // 🔥 CHỈNH SỬA: Kiểm tra xem mục tiêu (hàng rào hoặc cửa) có còn tồn tại không
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

        // Gây sát thương tại một thời điểm thích hợp trong animation
        this.scheduleOnce(() => {
            if (this.isAttacking && !this.isDead) {
                // 🔥 CHỈNH SỬA: Gây sát thương cho Hàng rào hoặc Cửa
                if (this.targetFenceScript?.isValid) {
                    this.targetFenceScript.takeDamage(this.damage);
                } else if (this.targetDoorScript?.isValid) {
                    this.targetDoorScript.takeDamage(this.damage);
                }
            }
        }, 0.3); // Thời gian delay trước khi gây damage

        // Lặp lại chu kỳ tấn công sau khi animation kết thúc
        this.spine.setCompleteListener(() => {
            if (this.isDead || !this.isAttacking) return;

            this.spine.setAnimation(0, "idle", true);
            this.scheduleOnce(() => {
                if (!this.isDead && this.isAttacking) {
                    this.startAttackCycle();
                }
            }, 0.2); // Thời gian nghỉ giữa các đòn đánh
        });
    }

    public die() {
        if (this.isDead) return;
        this.isDead = true;
        this.isMoving = false;
        this.isAttacking = false;
        this.unscheduleAllCallbacks();

        // Thêm hiệu ứng chớp đỏ khi bị tấn công để dễ nhận biết
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

        if (this.isMoving) {
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