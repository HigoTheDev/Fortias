import { _decorator, Component, Node, sp, Prefab, instantiate, Vec3 } from "cc";
import { GoblinController } from "db://assets/Scripts/Enemies/GoblinController";
import { TankProjectile } from "./TankProjectile";
import { EnemyManager} from "db://assets/Scripts/Enemies/EnemyManager";
const { ccclass, property } = _decorator;

enum TankState {
    IDLE,
    ATTACK,
    ULTIMATE,
}

@ccclass("Tank")
export class Tank extends Component {
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

    @property({ type: Prefab, tooltip: "Prefab hiệu ứng nổ của chiêu cuối" })
    ultimateExplosionPrefab: Prefab = null!;

    @property({ type: Number, tooltip: "Bán kính của vùng sát thương chiêu cuối" })
    ultimateAoeRadius: number = 150;

    @property({ type: Number, tooltip: "Số đạn cần bắn trước khi có thể dùng ulti" })
    shotsForUlti: number = 5;

    @property({ type: Number, tooltip: "Số lượng quái tối thiểu để kích hoạt ulti" })
    minGoblinsForUlti: number = 2;

    private currentState: TankState = TankState.IDLE;
    private targetGoblin: GoblinController | null = null;
    private lastAttackTime: number = 0;
    private projectileCount: number = 0;
    private ultimateImpactPosition: Vec3 = null;

    start() {
        if (!this.spine) {
            this.spine = this.getComponentInChildren(sp.Skeleton)!;
        }
        this.spine.setAnimation(0, "idle", true);

        this.spine.setCompleteListener((trackEntry) => {
            const animationName = trackEntry.animation.name;

            if (animationName === 'skill_1') {
                console.log("Ultimate animation finished. Detonating AOE.");

                const allEnemyNodes = EnemyManager.instance.getActiveEnemies();

                for (const enemyNode of allEnemyNodes) {
                    const goblinComp = enemyNode.getComponent(GoblinController);
                    if (goblinComp && !goblinComp.isDead) {
                        const dist = enemyNode.worldPosition.subtract(this.ultimateImpactPosition).length();
                        if (dist <= this.ultimateAoeRadius) {
                            goblinComp.die();
                        }
                    }
                }

                this.spawnUltimateExplosion(this.ultimateImpactPosition);

                this.projectileCount = 0;
                this.currentState = TankState.IDLE;
                this.spine.setAnimation(0, "idle", true);

            } else if (animationName === 'attack_range_1') {
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
                this.castUltimate();
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

        const projComp = projectile.getComponent(TankProjectile);
        projComp?.shoot(startPos, target, isRight);

        this.projectileCount++;
    }

    private spawnUltimateExplosion(position: Vec3) {
        if (!this.ultimateExplosionPrefab) return;
        const effect = instantiate(this.ultimateExplosionPrefab);
        this.node.parent.addChild(effect);
        effect.setWorldPosition(position);
        effect.setSiblingIndex(Number.MAX_SAFE_INTEGER);
    }

    private getAllGoblinsInRange(): GoblinController[] {
        // Lấy danh sách kẻ địch trực tiếp từ Singleton, cực nhanh!
        const allEnemyNodes = EnemyManager.instance.getActiveEnemies();
        const goblinsInRange: GoblinController[] = [];

        for (const enemyNode of allEnemyNodes) {
            const distSqr = Vec3.squaredDistance(this.node.worldPosition, enemyNode.worldPosition);
            if (distSqr <= this.detectionRange * this.detectionRange) {
                const goblinComp = enemyNode.getComponent(GoblinController);
                if (goblinComp && !goblinComp.isDead) {
                    goblinsInRange.push(goblinComp);
                }
            }
        }

        return goblinsInRange;
    }
}