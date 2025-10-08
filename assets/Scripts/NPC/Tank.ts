import { _decorator, Component, Node, sp, Prefab, instantiate, Vec3 } from "cc";
import { GoblinController } from "db://assets/Scripts/Enemies/GoblinController";
import { TankProjectile } from "./TankProjectile"; // Thay đổi để dùng TankProjectile
const { ccclass, property } = _decorator;

enum TankState {
    IDLE,
    ATTACK,
    ULTIMATE,
}

@ccclass("Tank")
export class Tank extends Component {
    // --- CÁC THUỘC TÍNH CƠ BẢN (Giống Support) ---
    @property(sp.Skeleton)
    spine: sp.Skeleton = null!;

    @property(Prefab)
    projectilePrefab: Prefab = null!;

    @property(Node)
    firePoint: Node = null!;

    @property
    detectionRange: number = 400;

    @property
    attackCooldown: number = 1.0;

    // --- THAY ĐỔI: CÁC THUỘC TÍNH CHO CHIÊU CUỐI AOE ---
    @property({ type: Prefab, tooltip: "Prefab hiệu ứng nổ của chiêu cuối" })
    ultimateExplosionPrefab: Prefab = null!;

    @property({ type: Number, tooltip: "Bán kính của vùng sát thương chiêu cuối" })
    ultimateAoeRadius: number = 150;

    @property({ type: Number, tooltip: "Số đạn cần bắn trước khi có thể dùng ulti" })
    shotsForUlti: number = 5;

    @property({ type: Number, tooltip: "Số lượng quái tối thiểu để kích hoạt ulti" })
    minGoblinsForUlti: number = 2;

    // --- CÁC BIẾN TRẠNG THÁI ---
    private currentState: TankState = TankState.IDLE;
    private targetGoblin: GoblinController | null = null;
    private lastAttackTime: number = 0;
    private projectileCount: number = 0;
    private ultimateImpactPosition: Vec3 = null; // --- MỚI: Lưu vị trí va chạm của ulti

    start() {
        if (!this.spine) {
            this.spine = this.getComponentInChildren(sp.Skeleton)!;
        }
        this.spine.setAnimation(0, "idle", true);

        // --- BỘ LẮNG NGHE SỰ KIỆN TRUNG TÂM ---
        this.spine.setCompleteListener((trackEntry) => {
            const animationName = trackEntry.animation.name;

            // 1. Xử lý khi animation ULTIMATE kết thúc
            if (animationName === 'skill_1') { // Giả sử tên animation ulti là 'skill_1'
                console.log("Ultimate animation finished. Detonating AOE.");

                // Tìm tất cả goblin trong scene
                const allGoblins = this.node.scene.getComponentsInChildren(GoblinController);

                // Lặp qua để kiểm tra khoảng cách với vị trí va chạm đã lưu
                for (const goblin of allGoblins) {
                    if (goblin.isDead) continue;

                    const dist = goblin.node.worldPosition.subtract(this.ultimateImpactPosition).length();
                    if (dist <= this.ultimateAoeRadius) {
                        goblin.die(); // Giết goblin trong vùng ảnh hưởng
                    }
                }

                // Tạo hiệu ứng nổ TẠI VÙNG ẢNH HƯỞNG
                this.spawnUltimateExplosion(this.ultimateImpactPosition);

                // Reset trạng thái
                this.projectileCount = 0;
                this.currentState = TankState.IDLE;
                this.spine.setAnimation(0, "idle", true);

                // 2. Xử lý khi animation TẤN CÔNG THƯỜNG kết thúc
            } else if (animationName === 'attack_range_1') { // Giả sử tên animation đánh thường
                if (this.currentState !== TankState.ULTIMATE) {
                    this.spine.setAnimation(0, "idle", true);
                }
            }
        });
    }

    update(dt: number) {
        switch (this.currentState) {
            case TankState.IDLE:
                this.findTarget();
                break;
            case TankState.ATTACK:
                this.attackLoop();
                break;
            case TankState.ULTIMATE:
                break;
        }
    }

    private findTarget() {
        const goblins = this.getAllGoblinsInRange();
        if (goblins.length > 0) {
            this.targetGoblin = goblins[0];
            this.currentState = TankState.ATTACK;
        }
    }

    private attackLoop() {
        if (!this.targetGoblin || this.targetGoblin.isDead || !this.targetGoblin.node.isValid) {
            this.currentState = TankState.IDLE;
            return;
        }

        if (this.projectileCount >= this.shotsForUlti) {
            const nearbyGoblins = this.getAllGoblinsInRange();
            if (nearbyGoblins.length >= this.minGoblinsForUlti) {
                this.castUltimate(); // Không cần truyền mục tiêu nữa
                return;
            }
        }

        const now = performance.now() / 1000;
        if (now - this.lastAttackTime >= this.attackCooldown) {
            this.shootProjectile(this.targetGoblin);
            this.lastAttackTime = now;
        }
    }

    private castUltimate() {
        console.log("Casting AOE Ultimate!");
        this.currentState = TankState.ULTIMATE;
        const nearbyGoblins = this.getAllGoblinsInRange();
        nearbyGoblins.sort((a, b) => {
            const distA = a.node.worldPosition.subtract(this.node.worldPosition).lengthSqr();
            const distB = b.node.worldPosition.subtract(this.node.worldPosition).lengthSqr();
            return distA - distB;
        });
        if (nearbyGoblins.length > 0) {
            this.ultimateImpactPosition = nearbyGoblins[0].node.worldPosition.clone();
        } else {
            this.ultimateImpactPosition = this.node.worldPosition.clone();
        }
        this.spine.setAnimation(0, "skill_1", false);
    }

    private shootProjectile(target: GoblinController) {
        if (!this.projectilePrefab) return;
        this.spine.setAnimation(0, "attack_range_1", false);

        const projectile = instantiate(this.projectilePrefab);
        this.node.parent.addChild(projectile);
        const isRight = target.node.worldPosition.x >= this.node.worldPosition.x;
        const startPos = this.firePoint ? this.firePoint.worldPosition : this.node.worldPosition;

        // Thay đổi để gọi component TankProjectile
        const projComp = projectile.getComponent(TankProjectile);
        projComp?.shoot(startPos, target, isRight);

        this.projectileCount++;
    }

    // --- MỚI: Hàm tạo hiệu ứng nổ cho ulti ---
    private spawnUltimateExplosion(position: Vec3) {
        if (!this.ultimateExplosionPrefab) return;
        const effect = instantiate(this.ultimateExplosionPrefab);
        this.node.parent.addChild(effect);
        effect.setWorldPosition(position);
        // Đặt hiệu ứng ở lớp trên các nhân vật để trông đẹp hơn
        effect.setSiblingIndex(Number.MAX_SAFE_INTEGER);
    }

    private getAllGoblinsInRange(): GoblinController[] {
        const allGoblins = this.node.scene.getComponentsInChildren(GoblinController);
        const validGoblins = [];
        for (const g of allGoblins) {
            if (g.isDead) continue;
            const dist = g.node.worldPosition.subtract(this.node.worldPosition).length();
            if (dist <= this.detectionRange) {
                validGoblins.push(g);
            }
        }
        return validGoblins;
    }
}