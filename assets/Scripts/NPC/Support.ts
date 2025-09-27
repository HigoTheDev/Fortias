import { _decorator, Component, Node, Vec3, sp, Collider2D, Contact2DType, IPhysics2DContact, Prefab, instantiate, Vec2, RigidBody2D } from 'cc';
import { GoblinController } from 'db://assets/Scripts/Enemies/GoblinController';
const { ccclass, property } = _decorator;

// Enum cho các trạng thái của State Machine
enum SupportState {
    IDLE = 0,
    ATTACK = 1,
    ULTIMATE = 2
}

@ccclass('Support')
export class Support extends Component {
    
    @property(sp.Skeleton)
    spine: sp.Skeleton = null!;
    
    @property(Prefab)
    public bulletPrefab: Prefab = null!;
    
    @property
    private detectionRange: number = 200;
    
    @property
    private attackRange: number = 150;
    
    @property
    private bulletSpeed: number = 300;
    
    @property
    private attackCooldown: number = 1.5;
    
    private currentState: SupportState = SupportState.IDLE;
    private targetGoblin: GoblinController = null;
    private lastAttackTime: number = 0;
    private originalScale: Vec3 = new Vec3(1, 1, 1);
    
    start() {
        if (!this.spine) {
            this.spine = this.getComponentInChildren(sp.Skeleton);
        }

        if (!this.spine) {
            console.error("Support: Không tìm thấy Spine component!");
            return;
        }

        this.originalScale = this.node.getScale();
        this.node.setScale(new Vec3(Math.abs(this.originalScale.x), this.originalScale.y, this.originalScale.z));

        this.setAnimation("idle", true);
        this.setState(SupportState.IDLE);
    }

    update(deltaTime: number) {
        this.updateStateMachine(deltaTime);
    }
    
    private updateStateMachine(deltaTime: number): void {
        switch (this.currentState) {
            case SupportState.IDLE:
                this.updateIdleState();
                break;
            case SupportState.ATTACK:
                this.updateAttackState(deltaTime);
                break;
            case SupportState.ULTIMATE:
                this.updateUltimateState();
                break;
        }
    }
    
    private updateIdleState(): void {
        const nearbyGoblin = this.findNearestGoblin();
        
        if (nearbyGoblin && this.getDistanceToTarget(nearbyGoblin.node) <= this.detectionRange) {
            this.targetGoblin = nearbyGoblin;
            this.setState(SupportState.ATTACK);
        }
    }

    private updateAttackState(deltaTime: number): void {
        if (!this.targetGoblin || !this.targetGoblin.node.isValid || this.targetGoblin.isDead) {
            this.targetGoblin = null;
            this.setState(SupportState.IDLE);
            return;
        }

        const distanceToTarget = this.getDistanceToTarget(this.targetGoblin.node);

        if (distanceToTarget > this.attackRange) {
            this.targetGoblin = null;
            this.setState(SupportState.IDLE);
            return;
        }

        const currentTime = Date.now() / 1000;
        if (currentTime - this.lastAttackTime >= this.attackCooldown) {
            this.performAttack();
            this.lastAttackTime = currentTime;
        }
    }

    private updateUltimateState(): void {
        // TODO: Implement ultimate state logic
        // Tạm thời quay về Idle sau 3 giây
        this.scheduleOnce(() => {
            this.setState(SupportState.IDLE);
        }, 3.0);
    }
    
    private setState(newState: SupportState): void {
        if (this.currentState === newState) return;

        this.unscheduleAllCallbacks();
        
        this.currentState = newState;

        switch (newState) {
            case SupportState.IDLE:
                this.scheduleOnce(() => {
                    this.setAnimation("idle", true);
                }, 0.1);
                break;
            case SupportState.ATTACK:
                break;
            case SupportState.ULTIMATE:
                this.setAnimation("ultimate", false);
                break;
        }
    }
    
    private performAttack(): void {
        if (!this.targetGoblin || !this.targetGoblin.node.isValid) return;

        this.setAnimation("attack_range_1", false);

        this.scheduleOnce(() => {
            this.createBullet();
        }, 0.3);

        if (this.spine) {
            this.spine.setCompleteListener((trackEntry) => {
                if (trackEntry.animation.name === "attack_range_1") {
                    this.setAnimation("idle", true);
                }
            });
        }
    }

    private createBullet(): void {
        if (!this.bulletPrefab || !this.targetGoblin || !this.targetGoblin.node.isValid) return;

        const bulletNode = instantiate(this.bulletPrefab);
        this.node.parent.addChild(bulletNode);
        bulletNode.setWorldPosition(this.node.worldPosition);

        const rigidBody = bulletNode.getComponent(RigidBody2D);
        if (!rigidBody) {
            console.error("Lỗi: Prefab của đạn phải có component RigidBody2D!");
            bulletNode.destroy();
            return;
        }

        rigidBody.gravityScale = 1.0;

        const startPos = this.node.worldPosition;
        const targetPos = this.targetGoblin.node.worldPosition;
        const delta = new Vec2(targetPos.x - startPos.x, targetPos.y - startPos.y);
        const gravity = -320 * rigidBody.gravityScale;
        const time = delta.length() / this.bulletSpeed;

        // ================================================================
        // THÊM ĐOẠN KIỂM TRA AN TOÀN NÀY
        // Nếu thời gian bay <= 0 (mục tiêu quá gần) hoặc không phải là số hợp lệ
        if (time <= 0 || !isFinite(time)) {
            console.warn("Mục tiêu quá gần hoặc thời gian bay không hợp lệ. Hủy bắn.");
            bulletNode.destroy(); // Hủy viên đạn vừa tạo ra
            return; // Dừng hàm tại đây
        }
        // ================================================================

        const velocityX = delta.x / time;
        const velocityY = (delta.y / time) - (0.5 * gravity * time);

        rigidBody.linearVelocity = new Vec2(velocityX, velocityY);

        const collider = bulletNode.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, (selfCollider, otherCollider, contact) => {
                const goblin = otherCollider.getComponent(GoblinController);
                if (goblin && !goblin.isDead) {
                    goblin.takeDamage(25);
                    if (bulletNode.isValid) bulletNode.destroy();
                }
            }, this);
        }

        this.scheduleOnce(() => {
            if (bulletNode.isValid) bulletNode.destroy();
        }, 5.0);
    }
    private findNearestGoblin(): GoblinController | null {
        const goblins = this.node.scene.getComponentsInChildren(GoblinController);
        let nearestGoblin: GoblinController | null = null;
        let nearestDistance = Number.MAX_VALUE;

        for (const goblin of goblins) {
            if (goblin.isDead) continue;

            // BỎ ĐIỀU KIỆN KIỂM TRA VỊ TRÍ X
            // const gPos = goblin.node.worldPosition;
            // const myPos = this.node.worldPosition;
            // if (gPos.x <= myPos.x) {
            //     continue;
            // }

            const distance = this.getDistanceToTarget(goblin.node);

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestGoblin = goblin;
            }
        }

        return nearestGoblin;
    }


    private getDistanceToTarget(targetNode: Node): number {
        const distance = new Vec3();
        Vec3.subtract(distance, targetNode.worldPosition, this.node.worldPosition);
        return distance.length();
    }


    private setAnimation(animationName: string, loop: boolean): void {
        if (this.spine && this.spine.isValid) {
            const currentAnim = this.spine.getCurrent(0);
            if (!currentAnim || currentAnim.animation.name !== animationName) {
                this.spine.setAnimation(0, animationName, loop);
            }
        } else {
            console.warn(`Support: Không thể set animation '${animationName}' - spine không hợp lệ`);
        }
    }

    public triggerUltimate(): void {
        this.setState(SupportState.ULTIMATE);
    }
}


