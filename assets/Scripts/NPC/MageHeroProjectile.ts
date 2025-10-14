import { _decorator, Component, Node, Vec3, math, Prefab, instantiate } from "cc";
import { GoblinController } from "db://assets/Scripts/Enemies/GoblinController";
const { ccclass, property } = _decorator;

@ccclass("MageProjectile")
export class MageProjectile extends Component {

    @property({ type: Prefab, tooltip: "Hiệu ứng nổ khi đạn trúng mục tiêu." })
    public hitEffectPrefab: Prefab | null = null;

    // --- Biến trạng thái nội bộ ---
    private speed: number = 500;
    private damage: number = 0;
    private targetGoblin: GoblinController | null = null;

    /**
     * Khởi tạo và bắn viên đạn.
     * @param startPos Vị trí bắt đầu.
     * @param target Đối tượng GoblinController làm mục tiêu.
     * @param damage Lượng sát thương sẽ gây ra.
     * @param speed Tốc độ bay của đạn (pixels/giây).
     * @param isFacingRight Hướng của người bắn, để lật hình viên đạn cho đúng.
     */
    public shoot(
        startPos: Vec3,
        target: GoblinController,
        damage: number,
        speed: number,
        isFacingRight: boolean
    ) {
        this.node.setWorldPosition(startPos);
        this.targetGoblin = target;
        this.damage = damage;
        this.speed = speed;

        const scale = this.node.getScale();
        this.node.setScale(
            isFacingRight ? Math.abs(scale.x) : -Math.abs(scale.x),
            scale.y,
            scale.z
        );
    }

    update(dt: number) {
        if (!this.targetGoblin || !this.targetGoblin.isValid || this.targetGoblin.isDead) {
            this.node.destroy();
            return;
        }
        const currentPos = this.node.worldPosition;
        const targetPos = this.targetGoblin.node.worldPosition;
        const direction = new Vec3();
        Vec3.subtract(direction, targetPos, currentPos);
        const distance = direction.length();
        const moveDistance = this.speed * dt;

        if (distance <= moveDistance) {
            this.handleHit(this.targetGoblin);
            this.node.destroy();
            return;
        }

        direction.normalize();
        const velocity = direction.multiplyScalar(moveDistance);
        this.node.translate(velocity);

        const angleRad = Math.atan2(direction.y, direction.x);
        const angleDeg = math.toDegree(angleRad);
        this.node.setRotationFromEuler(0, 0, angleDeg - 90);
    }

    /**
     * Xử lý khi viên đạn trúng mục tiêu.
     * @param target Goblin đã trúng đạn.
     */
    private handleHit(target: GoblinController) {
        target.takeDamage(this.damage);
        if (this.hitEffectPrefab) {
            const effect = instantiate(this.hitEffectPrefab);
            this.node.parent?.addChild(effect);
            effect.setWorldPosition(this.node.worldPosition);
        }
    }
}