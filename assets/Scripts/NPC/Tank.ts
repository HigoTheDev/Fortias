import { _decorator, Component, Node, sp, Prefab, instantiate } from "cc";
import { GoblinController } from "db://assets/Scripts/Enemies/GoblinController";
import { TankProjectile } from "./TankProjectile";
const { ccclass, property } = _decorator;

enum SupportState {
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
                break;
        }
    }

    private findTarget() {
        const goblins = this.getAllGoblinsInRange();
        if (goblins.length > 0) {
            this.targetGoblin = goblins[0];
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
                return;
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

        this.spine.setAnimation(0, "skill_1", false);

        this.spine.setCompleteListener((trackEntry) => {
            if (trackEntry.animation.name === "skill_1") {
                console.log("Ultimate animation finished. Killing targets.");
                for (const target of ultiTargets) {
                    if (target && !target.isDead) {
                        target.die();
                    }
                }

                this.projectileCount = 0;
                this.currentState = SupportState.IDLE;
                this.spine.setAnimation(0, "idle", true);

                this.spine.setCompleteListener(null);
            }
        });
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
        console.log(`Projectile count: ${this.projectileCount}`);

        this.spine.setCompleteListener((trackEntry) => {
            if (trackEntry.animation.name === "attack_range_1") {
                this.spine.setAnimation(0, "idle", true);
            }
        });
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