import { _decorator, Component, Node, sp, Prefab, instantiate, Vec3 } from "cc";
import { GoblinController } from "db://assets/Scripts/Enemies/GoblinController";
import { SupportProjectile } from "./SupportProjectile";
import { EnemyManager } from "db://assets/Scripts/Enemies/EnemyManager"; //

const { ccclass, property } = _decorator;

enum SupportState {
    IDLE,
    ATTACK,
    ULTIMATE,
}

@ccclass("Support")
export class Support extends Component {
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

    @property(Prefab)
    ultimateEffectPrefab: Prefab = null!;

    @property({ type: Node, tooltip: "Vị trí sinh ra hiệu ứng ulti của NPC. Nếu để trống, sẽ dùng vị trí của NPC." })
    ultiEffectPoint: Node = null;

    @property({ type: Number, tooltip: "Số đạn cần bắn trước khi có thể dùng ulti" })
    shotsForUlti: number = 5;

    @property({ type: Number, tooltip: "Số lượng quái tối thiểu để kích hoạt ulti" })
    minGoblinsForUlti: number = 2;

    @property({ type: Number, tooltip: "Số lượng mục tiêu tối đa của ulti" })
    maxUltiTargets: number = 5;

    public bulletContainer: Node = null;

    private currentState: SupportState = SupportState.IDLE;
    private targetGoblin: GoblinController | null = null;
    private lastAttackTime: number = 0;
    private projectileCount: number = 0;

    private ultimateImpactPosition: Vec3 = null;

    private ultimateTimer: number = 0;
    private readonly ULTIMATE_TIMEOUT: number = 5.0;

    start() {
        this.bulletContainer = new Node('NPC_Bullet_Container');
        this.node.parent.addChild(this.bulletContainer);
        if (!this.spine) {
            this.spine = this.getComponentInChildren(sp.Skeleton)!;
        }
        this.spine.setAnimation(0, "idle", true);

        this.spine.setCompleteListener((trackEntry) => {
            const animationName = trackEntry.animation.name;

            if (animationName === 'skill_1') { //
                console.log("Ultimate animation finished. Finding and killing targets now.");

                const allGoblins = this.getAllGoblinsInRange();

                allGoblins.sort((a, b) =>
                    Vec3.squaredDistance(this.ultimateImpactPosition, a.node.worldPosition) -
                    Vec3.squaredDistance(this.ultimateImpactPosition, b.node.worldPosition)
                );

                const finalTargets = allGoblins.slice(0, this.maxUltiTargets);

                for (const target of finalTargets) {
                    if (target && target.isValid && !target.isDead) {
                        target.die();
                    }
                }

                this.projectileCount = 0;
                this.currentState = SupportState.IDLE;
                this.spine.setAnimation(0, "idle", true);

            } else if (animationName === 'attack_range_1') {
                if (this.currentState !== SupportState.ULTIMATE) {
                    this.spine.setAnimation(0, "idle", true);
                }
            }
        });
    }

    update(dt: number) {
        switch (this.currentState) {
            case SupportState.IDLE:
                this.findTarget();
                break;
            case SupportState.ATTACK:
                this.attackLoop();
                break;
            case SupportState.ULTIMATE:
                this.ultimateTimer += dt;
                if (this.ultimateTimer >= this.ULTIMATE_TIMEOUT) {
                    console.warn("ULTIMATE TIMEOUT! Forcing state back to IDLE.");
                    this.projectileCount = 0;
                    this.currentState = SupportState.IDLE;
                    this.spine.setAnimation(0, "idle", true);
                }
                break;
        }
    }

    private findTarget() {
        const goblins = this.getAllGoblinsInRange();
        if (goblins.length > 0) {
            goblins.sort((a, b) =>
                Vec3.squaredDistance(this.node.worldPosition, a.node.worldPosition) -
                Vec3.squaredDistance(this.node.worldPosition, b.node.worldPosition)
            );
            this.targetGoblin = goblins[0];
            this.currentState = SupportState.ATTACK;
        }
    }

    private attackLoop() {
        if (!this.targetGoblin || !this.targetGoblin.isValid || this.targetGoblin.isDead) {
            this.currentState = SupportState.IDLE;
            this.targetGoblin = null;
            return;
        }

        if (this.projectileCount >= this.shotsForUlti) {
            const nearbyGoblins = this.getAllGoblinsInRange();
            if (nearbyGoblins.length >= this.minGoblinsForUlti) {
                this.castUltimate(nearbyGoblins);
                return;
            }
        }

        const now = performance.now() / 1000;
        if (now - this.lastAttackTime >= this.attackCooldown) {
            this.shootProjectile(this.targetGoblin);
            this.lastAttackTime = now;
        }
    }

    private castUltimate(nearbyGoblins: GoblinController[]) {
        console.log("Casting Ultimate!");
        this.currentState = SupportState.ULTIMATE;
        this.ultimateTimer = 0;

        if (nearbyGoblins.length > 0) {
            nearbyGoblins.sort((a, b) =>
                Vec3.squaredDistance(this.node.worldPosition, a.node.worldPosition) -
                Vec3.squaredDistance(this.node.worldPosition, b.node.worldPosition)
            );
            this.ultimateImpactPosition = nearbyGoblins[0].node.worldPosition.clone();
        } else {
            this.ultimateImpactPosition = this.node.worldPosition.clone();
        }

        if (this.ultimateEffectPrefab) {
            const npcEffectPos = this.ultiEffectPoint ? this.ultiEffectPoint.worldPosition : this.node.worldPosition;
            this.spawnUltiEffect(npcEffectPos);
        }

        const potentialTargets = nearbyGoblins.slice(0, this.maxUltiTargets);
        for (const target of potentialTargets) {
            if (target && target.isValid) {
                target.showUltimateTargetEffect();
            }
        }

        this.spine.setAnimation(0, "skill_1", false);
    }

    private shootProjectile(target: GoblinController) {
        if (!this.projectilePrefab) return;
        if (!this.bulletContainer) {
            console.error("Bullet Container chưa được gán trong Inspector!");
            return;
        }

        this.spine.setAnimation(0, "attack_range_1", false);

        const projectile = instantiate(this.projectilePrefab);
        this.bulletContainer.addChild(projectile);

        const isRight = target.node.worldPosition.x >= this.node.worldPosition.x;
        const startPos = this.firePoint ? this.firePoint.worldPosition : this.node.worldPosition;

        const projComp = projectile.getComponent(SupportProjectile);
        projComp?.shoot(startPos, target, isRight);

        this.projectileCount++;
    }

    private spawnUltiEffect(position: Vec3) {
        console.log("--- BẮT ĐẦU SPAWN ULTI EFFECT ---"); // LOG 4
        if (!this.ultimateEffectPrefab) {
            console.error("LỖI: ultimateEffectPrefab là NULL trong hàm spawn!");
            return;
        }
        const effect = instantiate(this.ultimateEffectPrefab);
        this.node.parent.addChild(effect);
        effect.setWorldPosition(position);
        effect.setSiblingIndex(3);

        console.log("Effect đã được tạo tại vị trí:", effect.worldPosition);
    }

    private getAllGoblinsInRange(): GoblinController[] {
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