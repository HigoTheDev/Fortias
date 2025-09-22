import { _decorator, Component, Node, Vec3, math, sp, Collider2D, Contact2DType, IPhysics2DContact } from 'cc';
import { Fence } from './Fence';
const { ccclass, property } = _decorator;

@ccclass('GoblinController')
export class GoblinController extends Component {

    private fences: Node[] = [];
    private targetFence: Node = null;
    private targetFenceScript: Fence = null;

    @property
    private moveSpeed: number = 50;

    @property
    private damage: number = 20;

    @property(sp.Skeleton)
    spine: sp.Skeleton = null!;

    private isMoving: boolean = true;
    private isAttacking: boolean = false;
    private originalScale: Vec3 = new Vec3(1, 1, 1);

    start() {
        if (!this.spine) {
            this.spine = this.getComponentInChildren(sp.Skeleton)!;
        }
        this.spine.setAnimation(0, "run", true);
        this.originalScale = this.node.getScale();

        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        }
    }

    setFences(fences: Node[]) {
        this.fences = fences;
        this.findNearestFence();
    }

    findNearestFence() {
        let nearestDistance = Infinity;
        this.targetFence = null;
        for (const fence of this.fences) {
            if (fence && fence.activeInHierarchy) {
                const distance = Vec3.distance(this.node.worldPosition, fence.worldPosition);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    this.targetFence = fence;
                }
            }
        }
    }

    update(deltaTime: number) {
        if (!this.targetFence || !this.targetFence.activeInHierarchy) {
            // Dừng tấn công khi mục tiêu bị phá hủy
            this.unscheduleAllCallbacks();
            this.isMoving = true;
            this.isAttacking = false;
            this.findNearestFence();
            if (!this.targetFence) {
                this.isMoving = false;
                this.setAnimation();
                return;
            }
        }
        if (this.isMoving) {
            const direction = new Vec3();
            Vec3.subtract(direction, this.targetFence.worldPosition, this.node.worldPosition);
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
        this.isMoving = false;
        this.targetFenceScript = otherCollider.node.getComponent(Fence);
        if (this.targetFenceScript && !this.isAttacking) {
            this.startAttackCycle();
        }
    }

    onEndContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        this.unscheduleAllCallbacks(); // Dừng tất cả các hành động đã lên lịch
        this.isMoving = true;
        this.isAttacking = false;
        this.setAnimation();
    }

    startAttackCycle() {
        this.isAttacking = true;
        // Chơi animation tấn công một lần duy nhất
        this.spine.setAnimation(0, "attack_melee_1", false);
        this.dealDamage(); // Gây sát thương ngay khi bắt đầu animation

        this.spine.setCompleteListener(() => {
            // Chuyển sang animation đứng yên
            this.spine.setAnimation(0, "idle", true);

            // Lên lịch cho lần tấn công tiếp theo
            this.scheduleOnce(() => {
                if (this.isAttacking) {
                    this.startAttackCycle();
                }
            }, 0.5); // Khoảng thời gian nghỉ giữa các lần đánh
        });
    }

    dealDamage() {
        if (this.targetFenceScript && this.targetFenceScript.isValid) {
            this.targetFenceScript.takeDamage(this.damage);
        }
    }

    setAnimation(yDirection: number = 0) {
        if (!this.isMoving) {
            if (!this.isAttacking && this.spine.getCurrent(0)?.animation?.name !== "idle") {
                this.spine.setAnimation(0, "idle", true);
            }
        } else {
            if (this.spine.getCurrent(0)?.animation?.name !== "run") {
                this.spine.setAnimation(0, "run", true);
            }
        }
    }
}