import { _decorator, Component, Node, Vec3, math } from "cc";
import { GoblinController } from "db://assets/Scripts/Enemies/GoblinController";
const { ccclass } = _decorator;

@ccclass("SupportProjectile")
export class SupportProjectile extends Component {
    private startPos: Vec3 = new Vec3();
    private endPos: Vec3 = new Vec3();
    private height: number = 100;       // độ cong parabol
    private duration: number = 0.8;     // thời gian bay
    private elapsed: number = 0;
    private targetGoblin: GoblinController | null = null;
    private isRight: boolean = true;

    public shoot(start: Vec3, targetGoblin: GoblinController, isRight: boolean) {
        this.startPos = start.clone();
        this.endPos = targetGoblin.node.worldPosition.clone();
        this.elapsed = 0;
        this.targetGoblin = targetGoblin;
        this.isRight = isRight;

        this.node.setWorldPosition(this.startPos);

        // Đặt sprite đạn thẳng ban đầu
        this.node.setRotationFromEuler(0, 0, -90);

        // Flip theo hướng
        const scale = this.node.getScale();
        this.node.setScale(
            this.isRight ? Math.abs(scale.x) : -Math.abs(scale.x),
            scale.y,
            scale.z
        );
    }

    update(dt: number) {
        if (!this.targetGoblin || !this.targetGoblin.node.isValid) {
            this.node.destroy();
            return;
        }

        this.elapsed += dt;
        const t = Math.min(this.elapsed / this.duration, 1);

        // Nội suy vị trí
        const x = math.lerp(this.startPos.x, this.endPos.x, t);
        const y = math.lerp(this.startPos.y, this.endPos.y, t);

        // Parabol
        const parabola = this.height * (1 - Math.pow(2 * t - 1, 2));
        const pos = new Vec3(x, y + parabola, 0);
        this.node.setWorldPosition(pos);

        // Quay đạn
        let angle = this.isRight ? math.lerp(90, -90, t) : math.lerp(-90, 90, t);
        this.node.setRotationFromEuler(0, 0, angle);

        // Khi chạm đích
        if (t >= 1) {
            if (this.targetGoblin && !this.targetGoblin.isDead) {
                this.targetGoblin.die();
            }
            this.node.destroy();
        }
    }
}
