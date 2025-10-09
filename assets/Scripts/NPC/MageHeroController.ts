import { _decorator, Component, Node, sp, Prefab, instantiate, Vec3 } from "cc";
import { GoblinController} from "db://assets/Scripts/Enemies/GoblinController";
import { EnemyManager} from "db://assets/Scripts/Enemies/EnemyManager";
import { SupportProjectile } from "db://assets/Scripts/NPC/SupportProjectile";

const { ccclass, property } = _decorator;

enum HeroState {
    IDLE,
    ATTACK,
    ULTIMATE,
}

@ccclass("MageHeroController")
export class MageHeroController extends Component {
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

    @property({ type: Number, tooltip: "Số đòn đánh thường trước khi dùng Ultimate" })
    shotsForUltimate: number = 5;

    @property({ type: Number, tooltip: "Số lượng Goblin tối thiểu để kích hoạt Ultimate" })
    minGoblinsForUltimate: number = 2;

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

            // Khi animation Ultimate kết thúc, quay về trạng thái IDLE
            if (animName === 'skill_1_270') { // GIỮ LẠI TÊN ANIMATION ULTI CỦA BẠN
                this.attackCount = 0; // Reset bộ đếm
                this.currentState = HeroState.IDLE;
                this.spine.setAnimation(0, "idle", true);
            }
            // Khi animation đánh thường kết thúc, quay về IDLE (nếu không đang trong trạng thái Ultimate)
            else if (animName === 'attack_range_1') {
                if (this.currentState !== HeroState.ULTIMATE) {
                    this.spine.setAnimation(0, "idle", true);
                }
            }
        });
    }

    update(dt: number) {
        // Chuyển đổi trạng thái dựa trên State Machine
        switch (this.currentState) {
            case HeroState.IDLE:
                this.findTarget();
                break;
            case HeroState.ATTACK:
                this.attackLoop();
                break;
            case HeroState.ULTIMATE:
                // Ở trạng thái Ultimate, hero sẽ không làm gì cho đến khi animation kết thúc
                break;
        }
    }

    private findTarget() {
        const goblins = this.getAllGoblinsInRange();
        if (goblins.length > 0) {
            // Sắp xếp để tìm ra goblin gần nhất
            goblins.sort((a, b) =>
                Vec3.squaredDistance(this.node.worldPosition, a.node.worldPosition) -
                Vec3.squaredDistance(this.node.worldPosition, b.node.worldPosition)
            );
            this.targetGoblin = goblins[0];
            this.currentState = HeroState.ATTACK; // Chuyển sang trạng thái tấn công
        }
    }

    private attackLoop() {
        // Nếu mục tiêu đã chết hoặc không hợp lệ, quay về tìm mục tiêu mới
        if (!this.targetGoblin || !this.targetGoblin.isValid || this.targetGoblin.isDead) {
            this.currentState = HeroState.IDLE;
            this.targetGoblin = null;
            return;
        }

        // Kiểm tra điều kiện để dùng Ultimate
        if (this.attackCount >= this.shotsForUltimate) {
            const nearbyGoblins = this.getAllGoblinsInRange();
            if (nearbyGoblins.length >= this.minGoblinsForUltimate) {
                this.castUltimate(); // Đủ điều kiện, tung chiêu cuối
                return;
            }
        }

        // Tấn công thường theo cooldown
        const now = performance.now() / 1000;
        if (now - this.lastAttackTime >= this.attackCooldown) {
            this.shootProjectile(this.targetGoblin);
            this.lastAttackTime = now;
        }
    }

    /**
     * TUNG CHIÊU CUỐI AOE
     * Giữ lại cơ chế spawn prefab AOE của bạn
     */
    private castUltimate() {
        this.currentState = HeroState.ULTIMATE; // Chuyển sang trạng thái Ultimate
        this.spine.setAnimation(0, "skill_1_270", false); // GIỮ LẠI TÊN ANIMATION ULTI CỦA BẠN

        // Lấy thời gian của animation
        const animDuration = this.spine.findAnimation("skill_1_270")?.duration ?? 1.0;

        // Hẹn giờ để spawn hiệu ứng AOE ở giữa animation
        this.scheduleOnce(() => this.spawnAOE(), animDuration * 0.5);
    }

    private spawnAOE() {
        if (!this.aoePrefab || !this.aoeSpawnPoint) return;
        const aoeEffect = instantiate(this.aoePrefab);
        this.node.parent?.addChild(aoeEffect);
        aoeEffect.setWorldPosition(this.aoeSpawnPoint.worldPosition);
    }

    private shootProjectile(target: GoblinController) {
        if (!this.projectilePrefab || !this.bulletContainer) return;

        this.spine.setAnimation(0, "attack_range_1", false); // GIỮ LẠI TÊN ANIMATION ĐÁNH THƯỜNG

        const projectileNode = instantiate(this.projectilePrefab);
        this.bulletContainer.addChild(projectileNode);

        const startPos = this.weaponPoint ? this.weaponPoint.worldPosition : this.node.worldPosition;
        const isRight = target.node.worldPosition.x >= this.node.worldPosition.x;

        const projectileScript = projectileNode.getComponent(SupportProjectile);
        projectileScript?.shoot(startPos, target, isRight);

        this.attackCount++; // Tăng bộ đếm
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