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
    private detectionRange: number = 200; // Phạm vi phát hiện Goblin
    
    @property
    private attackRange: number = 150; // Phạm vi tấn công
    
    @property
    private bulletSpeed: number = 300; // Tốc độ đạn
    
    @property
    private attackCooldown: number = 1.5; // Thời gian nghỉ giữa các đợt tấn công
    
    private currentState: SupportState = SupportState.IDLE;
    private targetGoblin: GoblinController = null;
    private lastAttackTime: number = 0;
    private originalScale: Vec3 = new Vec3(1, 1, 1);
    
    start() {
        // Khởi tạo spine nếu chưa có
        if (!this.spine) {
            this.spine = this.getComponentInChildren(sp.Skeleton);
        }
        
        // 🔥 SỬA: Kiểm tra spine có tồn tại không
        if (!this.spine) {
            console.error("Support: Không tìm thấy Spine component!");
            return;
        }
        
        // Lưu scale gốc để flip nhân vật
        this.originalScale = this.node.getScale();
        
        // 🔥 SỬA: Đảm bảo animation idle được set ngay từ đầu
        this.setAnimation("idle", true);
        
        // Bắt đầu ở trạng thái Idle
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
        // Tìm kiếm Goblin trong phạm vi
        const nearbyGoblin = this.findNearestGoblin();
        
        if (nearbyGoblin && this.getDistanceToTarget(nearbyGoblin.node) <= this.detectionRange) {
            this.targetGoblin = nearbyGoblin;
            this.setState(SupportState.ATTACK);
        }
    }
    
    private updateAttackState(deltaTime: number): void {
        // Kiểm tra xem target còn hợp lệ không
        if (!this.targetGoblin || !this.targetGoblin.node.isValid || this.targetGoblin.isDead) {
            this.targetGoblin = null;
            this.setState(SupportState.IDLE);
            return;
        }
        
        const distanceToTarget = this.getDistanceToTarget(this.targetGoblin.node);
        
        // Nếu Goblin ra khỏi phạm vi tấn công, quay về Idle
        if (distanceToTarget > this.attackRange) {
            this.targetGoblin = null;
            this.setState(SupportState.IDLE);
            return;
        }
        
        // Thực hiện tấn công nếu đã đủ thời gian cooldown
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
        
        // Cleanup old state
        this.unscheduleAllCallbacks();
        
        this.currentState = newState;
        
        // Setup new state
        switch (newState) {
            case SupportState.IDLE:
                // 🔥 SỬA: Đảm bảo animation idle được set đúng cách
                this.scheduleOnce(() => {
                    this.setAnimation("idle", true);
                }, 0.1);
                break;
            case SupportState.ATTACK:
                // Animation sẽ được set trong performAttack
                break;
            case SupportState.ULTIMATE:
                this.setAnimation("ultimate", false);
                break;
        }
    }
    
    private performAttack(): void {
        if (!this.targetGoblin || !this.targetGoblin.node.isValid) return;
        
        // Xoay nhân vật hướng về target
        this.faceTarget(this.targetGoblin.node);
        
        // Phát animation attack
        this.setAnimation("attack_range_1", false);
        
        // Tạo đạn sau 0.3 giây (thời gian animation)
        this.scheduleOnce(() => {
            this.createBullet();
        }, 0.3);
        
        // Set animation complete listener để quay về idle
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
        
        // Tạo bullet từ prefab
        const bulletNode = instantiate(this.bulletPrefab);
        this.node.parent.addChild(bulletNode);
        
        // Đặt vị trí bullet tại vị trí Support
        bulletNode.setWorldPosition(this.node.worldPosition);
        
        // Tính hướng bắn
        const direction = new Vec3();
        Vec3.subtract(direction, this.targetGoblin.node.worldPosition, this.node.worldPosition);
        direction.normalize();
        
        // Thêm RigidBody2D cho bullet nếu chưa có
        let rigidBody = bulletNode.getComponent(RigidBody2D);
        if (!rigidBody) {
            rigidBody = bulletNode.addComponent(RigidBody2D);
        }

        // Thiết lập velocity cho bullet
        const velocity = new Vec2(direction.x * this.bulletSpeed, direction.y * this.bulletSpeed);
        rigidBody.linearVelocity = velocity;

        // Hủy bullet sau 3 giây
        this.scheduleOnce(() => {
            if (bulletNode && bulletNode.isValid) {
                bulletNode.destroy();
            }
        }, 3.0);
    }
    
    private findNearestGoblin(): GoblinController | null {
        const goblins = this.node.scene.getComponentsInChildren(GoblinController);
        let nearestGoblin: GoblinController | null = null;
        let nearestDistance = Number.MAX_VALUE;
        
        for (const goblin of goblins) {
            if (goblin.isDead) continue;
            
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
    
    private faceTarget(targetNode: Node): void {
        const direction = new Vec3();
        Vec3.subtract(direction, targetNode.worldPosition, this.node.worldPosition);
        
        // 🔥 SỬA: Logic đúng - nếu target ở bên trái (direction.x < 0) thì flip
        if (direction.x < 0) {
            // Target ở bên trái, flip nhân vật
            this.node.setScale(new Vec3(-Math.abs(this.originalScale.x), this.originalScale.y, this.originalScale.z));
        } else if (direction.x > 0) {
            // Target ở bên phải, giữ nguyên hướng
            this.node.setScale(new Vec3(Math.abs(this.originalScale.x), this.originalScale.y, this.originalScale.z));
        }
    }
    
    // 🔥 SỬA: Thêm kiểm tra an toàn cho setAnimation
    private setAnimation(animationName: string, loop: boolean): void {
        if (this.spine && this.spine.isValid) {
            // Kiểm tra animation hiện tại để tránh set lại animation giống nhau
            const currentAnim = this.spine.getCurrent(0);
            if (!currentAnim || currentAnim.animation.name !== animationName) {
                this.spine.setAnimation(0, animationName, loop);
            }
        } else {
            console.warn(`Support: Không thể set animation '${animationName}' - spine không hợp lệ`);
        }
    }
    
    // Public method để trigger Ultimate state từ bên ngoài
    public triggerUltimate(): void {
        this.setState(SupportState.ULTIMATE);
    }
}


