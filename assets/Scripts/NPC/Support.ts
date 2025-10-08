import { _decorator, Component, Node, sp, Prefab, instantiate, Vec3 } from "cc";
import { GoblinController } from "db://assets/Scripts/Enemies/GoblinController";
import { SupportProjectile } from "./SupportProjectile";
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

    private currentState: SupportState = SupportState.IDLE;
    private targetGoblin: GoblinController | null = null;
    private lastAttackTime: number = 0;
    private projectileCount: number = 0;

    start() {
        if (!this.spine) {
            this.spine = this.getComponentInChildren(sp.Skeleton)!;
        }
        this.spine.setAnimation(0, "idle", true);

        this.spine.setCompleteListener((trackEntry) => {
            const animationName = trackEntry.animation.name;

            // 1. Xử lý khi animation ULTIMATE kết thúc
            if (animationName === 'skill_1') {
                console.log("Ultimate animation finished. Killing targets.");

                const nearbyGoblins = this.getAllGoblinsInRange();
                nearbyGoblins.sort((a, b) => {
                    const distA = a.node.worldPosition.subtract(this.node.worldPosition).lengthSqr();
                    const distB = b.node.worldPosition.subtract(this.node.worldPosition).lengthSqr();
                    return distA - distB;
                });
                const ultiTargets = nearbyGoblins.slice(0, this.maxUltiTargets);

                for (const target of ultiTargets) {
                    if (target && !target.isDead) {
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
                // Khi đang tung chiêu, không làm gì cả
                break;
        }
    }

    private findTarget() {
        const goblins = this.getAllGoblinsInRange();
        if (goblins.length > 0) {
            this.targetGoblin = goblins[0]; // Mục tiêu gần nhất
            this.currentState = SupportState.ATTACK;
        }
    }

    private attackLoop() {
        if (!this.targetGoblin || this.targetGoblin.isDead || !this.targetGoblin.node.isValid) {
            this.currentState = SupportState.IDLE;
            return;
        }

        if (this.projectileCount >= this.shotsForUlti) {
            const nearbyGoblins = this.getAllGoblinsInRange();
            if (nearbyGoblins.length >= this.minGoblinsForUlti) {
                this.castUltimate(nearbyGoblins);
                return; // Dừng lại để thực hiện ulti
            }
        }

        const now = performance.now() / 1000;
        if (now - this.lastAttackTime >= this.attackCooldown) {
            this.shootProjectile(this.targetGoblin);
            this.lastAttackTime = now;
        }
    }

    private castUltimate(allTargets: GoblinController[]) {
        console.log("Casting Ultimate!");
        this.currentState = SupportState.ULTIMATE;

        allTargets.sort((a, b) => {
            const distA = a.node.worldPosition.subtract(this.node.worldPosition).lengthSqr();
            const distB = b.node.worldPosition.subtract(this.node.worldPosition).lengthSqr();
            return distA - distB;
        });
        const ultiTargets = allTargets.slice(0, this.maxUltiTargets);

        if (this.ultimateEffectPrefab) {
            const npcEffectPos = this.ultiEffectPoint ? this.ultiEffectPoint.worldPosition : this.node.worldPosition;
            this.spawnUltiEffect(npcEffectPos);
        }
        for (const target of ultiTargets) {
            if (target && target.isValid) {
                target.showUltimateTargetEffect();
            }
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
        const projComp = projectile.getComponent(SupportProjectile);
        projComp?.shoot(startPos, target, isRight);

        this.projectileCount++;
        console.log(`Projectile count: ${this.projectileCount}`);
    }

    private spawnUltiEffect(position: Vec3) {
        if (!this.ultimateEffectPrefab) return;
        const effect = instantiate(this.ultimateEffectPrefab);
        this.node.parent.addChild(effect);
        effect.setWorldPosition(position);
        effect.setSiblingIndex(this.node.getSiblingIndex());
    }

    private getAllGoblinsInRange(): GoblinController[] {
        const allGoblins = this.node.scene.getComponentsInChildren(GoblinController);
        const validGoblins: GoblinController[] = [];

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