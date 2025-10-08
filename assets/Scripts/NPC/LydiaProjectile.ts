import { _decorator, Component, Node, Vec3, Prefab, instantiate, math } from "cc";
import { GoblinController } from "db://assets/Scripts/Enemies/GoblinController"; // THAY ĐỔI Ở ĐÂY

const { ccclass, property } = _decorator;

@ccclass("LydiaProjectile")
export class LydiaProjectile extends Component {
    @property({ tooltip: "Tốc độ bay của đạn" })
    speed: number = 800;

    @property({ type: Prefab, tooltip: "Hiệu ứng khi đạn va chạm" })
    impactEffectPrefab: Prefab = null!;

    @property({ tooltip: "Sát thương của viên đạn" })
    damage: number = 1;

    private targetEnemy: GoblinController | null = null; // THAY ĐỔI Ở ĐÂY
    private direction: Vec3 = new Vec3();

    public shoot(target: GoblinController) { // THAY ĐỔI Ở ĐÂY
        this.targetEnemy = target;
        if (this.targetEnemy && this.targetEnemy.node.isValid) {
            Vec3.subtract(this.direction, this.targetEnemy.node.worldPosition, this.node.worldPosition);
            this.direction.normalize();
            const angle = Math.atan2(this.direction.y, this.direction.x);
            this.node.angle = math.toDegree(angle);
        }
    }

    update(dt: number) {
        if (!this.targetEnemy || !this.targetEnemy.node.isValid || this.targetEnemy.isDead) {
            this.node.destroy();
            return;
        }

        Vec3.subtract(this.direction, this.targetEnemy.node.worldPosition, this.node.worldPosition);
        this.direction.normalize();

        const displacement = this.direction.clone().multiplyScalar(this.speed * dt);
        this.node.position = this.node.position.add(displacement);

        const angle = Math.atan2(this.direction.y, this.direction.x);
        this.node.angle = math.toDegree(angle);

        const distanceToTarget = Vec3.distance(this.node.worldPosition, this.targetEnemy.node.worldPosition);
        if (distanceToTarget < 20) {
            this.onImpact();
        }
    }

    private onImpact() {
        if (this.targetEnemy && !this.targetEnemy.isDead) {
            this.targetEnemy.takeDamage(this.damage);
        }

        if (this.impactEffectPrefab) {
            const effect = instantiate(this.impactEffectPrefab);
            this.node.parent.addChild(effect);
            effect.setWorldPosition(this.node.worldPosition);
        }

        this.node.destroy();
    }
}