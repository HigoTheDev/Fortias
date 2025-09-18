import { _decorator, Component, Node, Vec3, math, sp, Collider2D, Contact2DType, IPhysics2DContact } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GoblinController')
export class GoblinController extends Component {

    private fences: Node[] = [];
    private targetFence: Node = null;

    @property
    private moveSpeed: number = 50;

    @property(sp.Skeleton)
    spine: sp.Skeleton = null!;

    private isMoving: boolean = true;
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
            this.setAnimation(direction.y);
        }
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (otherCollider.node.name.includes("Fence")) {
            this.isMoving = false;
            this.setAnimation();
        }
    }

    setAnimation(yDirection: number = 0) {
        if (!this.isMoving) {
            if (this.spine.getCurrent(0)?.animation?.name !== "idle") {
                this.spine.setAnimation(0, "idle", true);
            }
        } else {
            if (yDirection > 0) {
                if (this.spine.getCurrent(0)?.animation?.name !== "run_90") {
                    this.spine.setAnimation(0, "run_90", true);
                }
            } else {
                if (this.spine.getCurrent(0)?.animation?.name !== "run") {
                    this.spine.setAnimation(0, "run", true);
                }
            }
        }
    }
}