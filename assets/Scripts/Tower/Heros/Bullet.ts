import {
    _decorator,
    Component,
    Vec3,
    Collider2D,
    IPhysics2DContact,
    CCFloat,
} from 'cc';
import { Enemy } from '../../Enemy/Enemy';
import { PoolManager } from "db://assets/PLAGameFoundation/gameControl/utilities/framework/poolManager";
import { TypeHero } from "db://assets/scripts/Utils/HeroData";
import { GameManager } from "db://assets/PLAGameFoundation/gameControl/core/manager/gameManager";
import { Constant } from "db://assets/constant/constant";
import {WorldEvent} from "db://assets/scripts/Utils/Enum";
import EventManager from "db://assets/scripts/Utils/EventManager";

const { ccclass, property } = _decorator;

@ccclass('Bullet')
export class Bullet extends Component {
    @property(Collider2D)
    collider: Collider2D = null;

    @property(CCFloat)
    maxLifetime: number = 10.0;

    @property(CCFloat)
    arcHeight: number = 100;

    private target: Enemy = null;
    private damage: number = 10;
    private speed: number = 300;
    private lifetime: number = 0;
    private isDestroyed: boolean = false;
    private heroType: TypeHero = null;

    private startPosition: Vec3 = new Vec3();
    private targetPosition: Vec3 = new Vec3();
    private flightTime: number = 0;
    private totalFlightTime: number = 0;

    init() {
        this.lifetime = 0;
        this.isDestroyed = false;
        this.flightTime = 0;
        this.startPosition = this.node.worldPosition.clone();
        this.node.setRotation(0, 0, 0, 0);

        if (!this.collider) {
            this.collider = this.node.getComponent(Collider2D);
        }
        this.node.children[0].active = true;
    }

    protected update(deltaTime: number): void {
        if (this.isDestroyed) return;

        this.lifetime += deltaTime;
        if (this.lifetime >= this.maxLifetime) {
            this.destroyBullet();
            return;
        }

        if (!this.target || !this.target.node || !this.target.node.active || !this.target.node.isValid) {
            this.destroyBullet();
            return;
        }

        this.moveInParabolicArc(deltaTime);
    }

    private moveInParabolicArc(deltaTime: number): void {
        if (!this.target || !this.target.node) return;

        this.targetPosition = this.target.node.worldPosition.clone();
        this.flightTime += deltaTime;

        const progress = Math.min(this.flightTime * this.speed / 300, 1);

        const currentX = this.startPosition.x + (this.targetPosition.x - this.startPosition.x) * progress;
        const currentZ = this.startPosition.z + (this.targetPosition.z - this.startPosition.z) * progress;

        const baseY = this.startPosition.y + (this.targetPosition.y - this.startPosition.y) * progress;
        const arcY = 4 * this.arcHeight * progress * (1 - progress);
        const currentY = baseY + arcY;

        const prevPosition = this.node.worldPosition.clone();
        const newPosition = new Vec3(currentX, currentY, currentZ);
        this.node.setWorldPosition(newPosition);

        // === ROTATE BULLET TO FOLLOW PARABOLIC TRAJECTORY ===
        const dir = new Vec3();
        Vec3.subtract(dir, newPosition, prevPosition);

        if (!dir.equals(Vec3.ZERO)) {
            const horizontalDistance = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
            const pitchRadians = Math.atan2(dir.y, horizontalDistance);
            const pitchDegrees = pitchRadians * 180 / Math.PI;
            
            // Calculate yaw angle (rotation in horizontal plane)
            const yawRadians = Math.atan2(dir.z, dir.x);
            const yawDegrees = yawRadians * 180 / Math.PI;

            const currentEuler = this.node.eulerAngles.clone();
            currentEuler.y = -yawDegrees;  // Horizontal rotation
            
            // Reverse pitch angle when moving left (negative X direction)
            if (dir.x < 0) {
                currentEuler.z = -pitchDegrees;  // Reverse pitch for left movement
            } else {
                currentEuler.z = pitchDegrees;   // Normal pitch for right movement
            }
            
            this.node.setRotationFromEuler(currentEuler);
            
            // Flip scale.x when moving left (negative X direction)
            const currentScale = this.node.scale.clone();
            currentScale.x = dir.x < 0 ? -Math.abs(currentScale.x) : Math.abs(currentScale.x);
            this.node.setScale(currentScale);
        }
        // =====================================================

        if (progress >= 1) {
            this.hitEnemy(this.target);
            return;
        }

        const distance = Vec3.distance(newPosition, this.targetPosition);
        if (distance < 20) {
            this.hitEnemy(this.target);
        }
    }

    private onCollisionEnter(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null): void {
        if (this.isDestroyed) return;

        const enemy = otherCollider.node.getComponent(Enemy);
        if (enemy) {
            this.hitEnemy(enemy);
        }
    }

    private hitEnemy(enemy: Enemy): void {
        if (this.isDestroyed) return;

        if (enemy && enemy.node && enemy.node.active) {
            enemy.takeDamage(this.damage);
        }

        this.destroyBullet();
    }

    private destroyBullet(): void {
        if (this.isDestroyed) return;

        this.isDestroyed = true;

        if (this.heroType === TypeHero.LUCIUS) {
            GameManager.instance.audioManager.playSound(Constant.AUDIO_NAME.SFX_LUCIUS_ATTACK_RANGE_IMPACT);
        } else if (this.heroType === TypeHero.ALDRYCH) {
            GameManager.instance.audioManager.playSound(Constant.AUDIO_NAME.SFX_ALDRYCH_ATTACK_IMPACT);
        } else if (this.heroType === TypeHero.DAENA) {
            GameManager.instance.audioManager.playSound(Constant.AUDIO_NAME.SFX_DAENA_ATTACK_IMPACT);
        } else if (this.heroType === TypeHero.LYDIA) {
            GameManager.instance.audioManager.playSound(Constant.AUDIO_NAME.SFX_LYDIA_ATTACK_RANGE_IMPACT);
        }

        EventManager.emit(WorldEvent.DestroyBullet, this.node.worldPosition, this.heroType);
        setTimeout(() => {
            if (this.node && this.node.isValid) {
                if (this.collider && this.collider.enabled) {
                    this.collider.enabled = false;
                }
                setTimeout(() => {
                    if (this.node && this.node.isValid) {
                        PoolManager.instance.putNode(this.node);
                    }
                }, 10);
            }
        }, 0);
    }

    public setTarget(enemy: Enemy): void {
        this.target = enemy;
        if (enemy && enemy.node) {
            const distance = Vec3.distance(this.node.worldPosition, enemy.node.worldPosition);
            this.totalFlightTime = distance / this.speed;
        }
    }

    public setDamage(damage: number): void {
        this.damage = damage;
    }

    public setSpeed(speed: number): void {
        this.speed = speed;
    }

    public setHeroType(type: TypeHero): void {
        this.heroType = type;
    }

    public set Destroyed(value: boolean) {
        this.isDestroyed = value;
    }
}
