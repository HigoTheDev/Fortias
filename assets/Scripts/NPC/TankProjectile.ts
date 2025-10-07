import { _decorator, Component, Node, Vec3, math, Prefab, instantiate } from "cc";
import { GoblinController } from "db://assets/Scripts/Enemies/GoblinController";
const { ccclass, property } = _decorator;

@ccclass("TankProjectile")
export class TankProjectile extends Component {
    @property
    rotationSpeed: number = 360; // Đảm bảo giá trị này khác 0 trong Inspector

    @property(Prefab)
    impactEffectPrefab: Prefab = null!;

    private startPos: Vec3 = new Vec3();
    private endPos: Vec3 = new Vec3();
    private height: number = 100;
    private duration: number = 0.8;
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
        this.node.setRotationFromEuler(0, 0, -90);

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
        let t = this.elapsed / this.duration;

        const x = math.lerp(this.startPos.x, this.endPos.x, t);
        const y = math.lerp(this.startPos.y, this.endPos.y, t);
        const parabola = this.height * (1 - Math.pow(2 * t - 1, 2));
        const pos = new Vec3(x, y + parabola, 0);
        this.node.setWorldPosition(pos);

        const vx = (this.endPos.x - this.startPos.x) / this.duration;
        const vy_linear = (this.endPos.y - this.startPos.y) / this.duration;
        const vy_parabolic = (this.height * (4 - 8 * t)) / this.duration;
        const vy = vy_linear + vy_parabolic;
        const angleRad = Math.atan2(vy, vx);
        this.node.angle = math.toDegree(angleRad) + 180;
        // --------------------------------------------------------

        t = Math.min(t, 1);

        if (t >= 1) {
            if (this.targetGoblin && !this.targetGoblin.isDead) {
                this.targetGoblin.die();

                if (this.impactEffectPrefab) {
                    const effect = instantiate(this.impactEffectPrefab);
                    this.node.parent.addChild(effect);
                    effect.setWorldPosition(this.node.worldPosition);
                }
            }
            this.node.destroy();
        }
    }
}