import { _decorator, Component, Node, sp, Prefab, instantiate, Vec3, Vec2, Rect} from "cc";
import { GoblinController} from "db://assets/Scripts/Enemies/GoblinController";
import { EnemyManager} from "db://assets/Scripts/Enemies/EnemyManager";
import {SupportProjectile} from "db://assets/Scripts/NPC/SupportProjectile";


const { ccclass, property } = _decorator;

enum HeroState {
    IDLE,
    ATTACK,
    ULTIMATE,
}

@ccclass("MageHeroController")
export class MageHeroController extends Component {
    // --- CÁC THUỘC TÍNH CƠ BẢN ---
    @property(sp.Skeleton)
    spine: sp.Skeleton = null!;

    @property({ type: Prefab, tooltip: "Prefab của đạn bắn thường (SupportProjectile)" })
    projectilePrefab: Prefab = null!;

    @property({ type: Prefab, tooltip: "Prefab của hiệu ứng Ultimate AOE" })
    aoePrefab: Prefab = null!;

    @property({ type: Node, tooltip: "Vị trí bắn đạn" })
    weaponPoint: Node = null!;

    @property({ type: Node, tooltip: "Vị trí xuất hiện hiệu ứng AOE" })
    aoeSpawnPoint: Node = null!;

    @property({ tooltip: "Tầm phát hiện kẻ thù" })
    detectionRange: number = 400;

    @property({ tooltip: "Thời gian nghỉ giữa các đòn đánh thường" })
    attackCooldown: number = 1.0;

    // --- THUỘC TÍNH CHO ULTIMATE ---
    @property({ type: Number, tooltip: "Số đòn đánh thường trước khi dùng Ultimate" })
    shotsForUltimate: number = 5;

    @property({ type: Number, tooltip: "Số lượng Goblin tối thiểu để kích hoạt Ultimate" })
    minGoblinsForUltimate: number = 2;

    @property({ type: Number, tooltip: "Chiều rộng (độ dài) của vùng beam" })
    ultimateBeamWidth: number = 800;

    @property({ type: Number, tooltip: "Chiều cao của vùng beam" })
    ultimateBeamHeight: number = 200;

    // --- CÁC BIẾN TRẠNG THÁI ---
    private currentState: HeroState = HeroState.IDLE;
    private targetGoblin: GoblinController | null = null;
    private lastAttackTime: number = 0;
    private attackCount: number = 0;
    private bulletContainer: Node | null = null;

    start() {
        this.bulletContainer = new Node('Mage_Bullet_Container');
        this.node.parent?.addChild(this.bulletContainer);

        this.spine.setAnimation(0, "idle", true);

        this.spine.setCompleteListener((trackEntry) => {
            const animName = trackEntry.animation.name;

            if (animName === 'skill_1_270') {
                this.attackCount = 0;
                this.currentState = HeroState.IDLE;
                this.spine.setAnimation(0, "idle", true);
            }
            else if (animName === 'attack_range_1') {
                if (this.currentState !== HeroState.ULTIMATE) {
                    this.spine.setAnimation(0, "idle", true);
                }
            }
        });
    }

    update(dt: number) {
        switch (this.currentState) {
            case HeroState.IDLE:
                this.findTarget();
                break;
            case HeroState.ATTACK:
                this.attackLoop();
                break;
            case HeroState.ULTIMATE:
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
            this.currentState = HeroState.ATTACK;
        }
    }

    private attackLoop() {
        if (!this.targetGoblin || !this.targetGoblin.isValid || this.targetGoblin.isDead) {
            this.currentState = HeroState.IDLE;
            this.targetGoblin = null;
            return;
        }

        if (this.attackCount >= this.shotsForUltimate) {
            const nearbyGoblins = this.getAllGoblinsInRange();
            if (nearbyGoblins.length >= this.minGoblinsForUltimate) {
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
        this.currentState = HeroState.ULTIMATE;
        this.spine.setAnimation(0, "skill_1_270", false);
        this.spawnAOE();
        this.scheduleOnce(() => this.dealBeamDamage(), 1.0);
    }

    private spawnAOE() {
        if (!this.aoePrefab || !this.aoeSpawnPoint) return;
        const aoeEffect = instantiate(this.aoePrefab);
        this.node.parent?.addChild(aoeEffect);
        aoeEffect.setWorldPosition(this.aoeSpawnPoint.worldPosition);
    }

    private dealBeamDamage() {
        if (!EnemyManager.instance) return;

        // 1. Xác định tâm của vùng beam
        const beamCenter = this.aoeSpawnPoint ? this.aoeSpawnPoint.worldPosition : this.node.worldPosition;

        // 2. Tạo một hình chữ nhật (Rect) đại diện cho vùng beam
        const beamRect = new Rect(
            beamCenter.x - this.ultimateBeamWidth,      // Tọa độ x bên trái
            beamCenter.y - this.ultimateBeamHeight / 2, // Tọa độ y phía dưới
            this.ultimateBeamWidth,                     // Chiều rộng
            this.ultimateBeamHeight
        );

        const allEnemies = EnemyManager.instance.getActiveEnemies();
        for (const enemyNode of allEnemies) {
            const goblinScript = enemyNode.getComponent(GoblinController);
            if (goblinScript && !goblinScript.isDead) {
                const goblinPosition2D = new Vec2(enemyNode.worldPosition.x, enemyNode.worldPosition.y);
                if (beamRect.contains(goblinPosition2D)) {
                    goblinScript.die();
                }
            }
        }
    }

    private shootProjectile(target: GoblinController) {
        if (!this.projectilePrefab || !this.bulletContainer) return;

        this.spine.setAnimation(0, "attack_range_1", false);

        const projectileNode = instantiate(this.projectilePrefab);
        this.bulletContainer.addChild(projectileNode);

        const startPos = this.weaponPoint ? this.weaponPoint.worldPosition : this.node.worldPosition;
        const isRight = target.node.worldPosition.x >= this.node.worldPosition.x;

        const projectileScript = projectileNode.getComponent(SupportProjectile);
        projectileScript?.shoot(startPos, target, isRight);

        this.attackCount++;
    }

    private getAllGoblinsInRange(): GoblinController[] {
        if (!EnemyManager.instance) return [];

        const allEnemyNodes = EnemyManager.instance.getActiveEnemies();
        const goblinsInRange: GoblinController[] = [];
        const rangeSqr = this.detectionRange * this.detectionRange;

        for (const enemyNode of allEnemyNodes) {
            const distSqr = Vec3.squaredDistance(this.node.worldPosition, enemyNode.worldPosition);
            if (distSqr <= rangeSqr) {
                const goblinComp = enemyNode.getComponent(GoblinController);
                if (goblinComp && !goblinComp.isDead) {
                    goblinsInRange.push(goblinComp);
                }
            }
        }
        return goblinsInRange;
    }
}