import { _decorator, Component, Node, sp, Prefab, instantiate, Vec3 } from "cc";
import { GoblinController } from "db://assets/Scripts/Enemies/GoblinController";
import { PreArcProjectile} from "db://assets/Scripts/NPC/PreArcProjectile";
import { EnemyManager } from "db://assets/Scripts/Enemies/EnemyManager";

const { ccclass, property } = _decorator;

enum PreArcState {
    IDLE,
    ATTACK,
    ULTIMATE,
}

@ccclass("PreArc")
export class PreArc extends Component {
    @property(sp.Skeleton)
    spine: sp.Skeleton = null!;

    @property(Prefab)
    projectilePrefab: Prefab = null!;

    @property(Node)
    firePoint: Node = null!;

    public objectContainer: Node = null;

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

    @property({
        type: Number,
        tooltip: "Độ trễ (giây) từ lúc bắt đầu animation ulti đến khi hiệu ứng nổ xuất hiện."
    })
    public ultimateEffectDelay: number = 0.5;

    private currentState: PreArcState = PreArcState.IDLE;
    private targetGoblin: GoblinController | null = null;
    private lastAttackTime: number = 0;
    private projectileCount: number = 0;
    private ultimateImpactPosition: Vec3 = null;

    start() {
        this.objectContainer = new Node('NPC_bullet-container');
        this.node.parent.addChild(this.objectContainer);
        if (!this.spine) {
            this.spine = this.getComponentInChildren(sp.Skeleton)!;
        }
        this.spine.setAnimation(0, "idle", true);

        this.spine.setCompleteListener((trackEntry) => {
            const animationName = trackEntry.animation.name;

            if (animationName === 'skill_1') {
                this.projectileCount = 0;
                this.currentState = PreArcState.IDLE;
                this.spine.setAnimation(0, "idle", true);
            } else if (animationName === 'attack_range_1') {
                if (this.currentState !== PreArcState.ULTIMATE) {
                    this.spine.setAnimation(0, "idle", true);
                }
            }
        });
    }

    update(dt: number) {
        switch (this.currentState) {
            case PreArcState.IDLE:
                this.findTarget();
                break;
            case PreArcState.ATTACK:
                this.attackLoop();
                break;
            case PreArcState.ULTIMATE:
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
            this.currentState = PreArcState.ATTACK;
        }
    }

    private attackLoop() {
        if (!this.targetGoblin || !this.targetGoblin.isValid || this.targetGoblin.isDead) {
            this.currentState = PreArcState.IDLE;
            this.targetGoblin = null;
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
        this.currentState = PreArcState.ULTIMATE;
        const nearbyGoblins = this.getAllGoblinsInRange();
        nearbyGoblins.sort((a, b) =>
            Vec3.squaredDistance(this.node.worldPosition, a.node.worldPosition) -
            Vec3.squaredDistance(this.node.worldPosition, b.node.worldPosition)
        );
        if (nearbyGoblins.length > 0) {
            this.ultimateImpactPosition = nearbyGoblins[0].node.worldPosition.clone();
        } else {
            this.ultimateImpactPosition = this.node.worldPosition.clone();
        }
        this.spine.setAnimation(0, "skill_1", false);

        this.scheduleOnce(this.triggerUltimateDamageAndEffect, this.ultimateEffectDelay);
    }

    private triggerUltimateDamageAndEffect() {
        console.log(`Triggering AOE damage and effect after ${this.ultimateEffectDelay}s`);
        const allEnemyNodes = EnemyManager.instance.getActiveEnemies();
        for (const enemyNode of allEnemyNodes) {
            const goblinComp = enemyNode.getComponent(GoblinController);
            if (goblinComp && goblinComp.isValid && !goblinComp.isDead) {
                const dist = Vec3.distance(enemyNode.worldPosition, this.ultimateImpactPosition);
                if (dist <= this.ultimateAoeRadius) {
                    goblinComp.die();
                }
            }
        }
        this.spawnUltimateExplosion(this.ultimateImpactPosition);
    }


    private shootProjectile(target: GoblinController) {
        if (!this.projectilePrefab) return;
        if (!this.objectContainer) {
            console.error(`Object Container chưa được gán cho Tank: ${this.node.name}`);
            return;
        }
        this.spine.setAnimation(0, "attack_range_1", false);
        const projectile = instantiate(this.projectilePrefab);
        this.objectContainer.addChild(projectile);
        const startPos = this.firePoint ? this.firePoint.worldPosition : this.node.worldPosition;
        const isRight = target.node.worldPosition.x >= this.node.worldPosition.x;
        const projComp = projectile.getComponent(PreArcProjectile);
        projComp?.shoot(startPos, target, isRight);

        this.projectileCount++;
    }

    private spawnUltimateExplosion(position: Vec3) {
        if (!this.ultimateExplosionPrefab) return;
        if (!this.objectContainer) {
            console.error(`Object Container chưa được gán cho Tank: ${this.node.name}`);
            return;
        }
        const effect = instantiate(this.ultimateExplosionPrefab);
        this.objectContainer.addChild(effect);
        effect.setWorldPosition(position);
        effect.setSiblingIndex(Number.MAX_SAFE_INTEGER);
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