import { _decorator, Component, Node, sp, Prefab, instantiate } from "cc";
import { GoblinController } from "db://assets/Scripts/Enemies/GoblinController";
import { SupportProjectile } from "./SupportProjectile";
const { ccclass, property } = _decorator;

enum SupportState {
    IDLE,
    ATTACK,
}

@ccclass("Support")
export class Support extends Component {
    @property(sp.Skeleton)
    spine: sp.Skeleton = null!;

    @property(Prefab)
    projectilePrefab: Prefab = null!;

    @property
    detectionRange: number = 400;

    @property
    attackCooldown: number = 1.0;

    private currentState: SupportState = SupportState.IDLE;
    private targetGoblin: GoblinController | null = null;
    private lastAttackTime: number = 0;

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
        }
    }

    private findTarget() {
        const goblins = this.node.scene.getComponentsInChildren(GoblinController);
        let nearest: GoblinController | null = null;
        let nearestDist = Number.MAX_VALUE;

        for (const g of goblins) {
            if (g.isDead) continue;
            const dist = g.node.worldPosition.subtract(this.node.worldPosition).length();
            if (dist < nearestDist && dist <= this.detectionRange) {
                nearest = g;
                nearestDist = dist;
            }
        }

        if (nearest) {
            this.targetGoblin = nearest;
            this.currentState = SupportState.ATTACK;
        }
    }

    private attackLoop() {
        if (!this.targetGoblin || this.targetGoblin.isDead || !this.targetGoblin.node.isValid) {
            this.currentState = SupportState.IDLE;
            return;
        }

        const now = performance.now() / 1000;
        if (now - this.lastAttackTime >= this.attackCooldown) {
            this.shootProjectile(this.targetGoblin);
            this.lastAttackTime = now;
        }
    }

    private shootProjectile(target: GoblinController) {
        if (!this.projectilePrefab) return;

        this.spine.setAnimation(0, "attack_range_1", false);

        const projectile = instantiate(this.projectilePrefab);
        this.node.parent.addChild(projectile);

        const isRight = target.node.worldPosition.x >= this.node.worldPosition.x;

        const projComp = projectile.getComponent(SupportProjectile);
        projComp?.shoot(this.node.worldPosition, target, isRight);

        this.spine.setCompleteListener((trackEntry) => {
            if (trackEntry.animation.name === "attack_range_1") {
                this.spine.setAnimation(0, "idle", true);
            }
        });
    }
}
