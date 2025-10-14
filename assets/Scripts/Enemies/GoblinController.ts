import { _decorator, Component, Node, Vec3, sp, Collider2D, Contact2DType, IPhysics2DContact, Color, Prefab, instantiate } from 'cc';
import { Fence } from "db://assets/Scripts/Props/Fence";
import { DoorController } from "db://assets/Scripts/Props/DoorController";
import { PlayerSpine } from "db://assets/Scripts/Player/PlayerSpine";
import { RubyManager} from "db://assets/Scripts/Currency/RubyManager";

const { ccclass, property } = _decorator;

@ccclass('GoblinController')
export class GoblinController extends Component {

    // --- Thuộc tính có thể chỉnh sửa trong Inspector ---
    @property(sp.Skeleton)
    spine: sp.Skeleton = null!;

    @property({ type: Prefab, tooltip: "Prefab Ruby sẽ rơi ra khi chết." })
    public rubyPrefab: Prefab = null!;

    @property({ type: Prefab, tooltip: "Hiệu ứng xuất hiện khi bị chiêu cuối nhắm tới." })
    public ultimateTargetEffectPrefab: Prefab = null!;

    @property({ tooltip: "Tốc độ di chuyển của Goblin." })
    private moveSpeed: number = 50;

    @property({ tooltip: "Sát thương Goblin gây ra cho hàng rào/cửa." })
    private damage: number = 20;

    @property({ tooltip: "Máu tối đa của Goblin." })
    public maxHealth: number = 100;

    // --- Biến trạng thái nội bộ ---
    private playerNode: Node = null!;
    private targetFenceScript: Fence | null = null;
    private targetDoorScript: DoorController | null = null;

    public isActivated: boolean = false;
    public isDead: boolean = false;
    private isMoving: boolean = true;
    private isAttacking: boolean = false;
    private currentHealth: number = 0;
    private originalScale: Vec3 = new Vec3(1, 1, 1);

    start() {
        if (!this.spine) {
            this.spine = this.getComponentInChildren(sp.Skeleton)!;
        }
        this.originalScale = this.node.getScale();
        this.currentHealth = this.maxHealth;
        this.isDead = false;

        const playerComponent = this.node.scene.getComponentInChildren(PlayerSpine);
        if (playerComponent) {
            this.playerNode = playerComponent.node;
        } else {
            console.error("Goblin không thể tìm thấy Player trong Scene!");
        }

        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        }

        this.spine.setAnimation(0, "idle", true);
    }

    update(deltaTime: number) {
        if (this.isDead || this.isAttacking || !this.isActivated) {
            return;
        }

        if (this.isMoving && this.playerNode) {
            const direction = new Vec3();
            Vec3.subtract(direction, this.playerNode.worldPosition, this.node.worldPosition);

            if (direction.x > 0) {
                this.node.setScale(this.originalScale);
            } else if (direction.x < 0) {
                this.node.setScale(new Vec3(-this.originalScale.x, this.originalScale.y, this.originalScale.z));
            }
            direction.normalize();
            this.node.translate(direction.multiplyScalar(this.moveSpeed * deltaTime));
        }

        this.setAnimation();
    }

    public activate() {
        if (this.isDead) return;
        this.isActivated = true;
        this.setAnimation();
    }

    public takeDamage(damageAmount: number) {
        if (this.isDead) return;
        this.currentHealth -= damageAmount;
        this.spine.color = Color.RED;
        this.scheduleOnce(() => {
            if(this.spine) this.spine.color = Color.WHITE;
        }, 0.1);

        if (this.currentHealth <= 0) {
            this.die();
        }
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (!this.isActivated || this.isDead || this.isAttacking) return;

        const fenceScript = otherCollider.getComponent(Fence);
        if (fenceScript) {
            this.isMoving = false;
            this.targetFenceScript = fenceScript;
            this.isAttacking = true;
            this.startAttackCycle();
            return;
        }

        if (otherCollider.node.name === 'Door_obj') {
            const doorScript = otherCollider.node.parent?.getComponent(DoorController);
            if (doorScript) {
                this.isMoving = false;
                this.targetDoorScript = doorScript;
                this.isAttacking = true;
                this.startAttackCycle();
                return;
            }
        }
    }

    onEndContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (this.isDead) return;

        const fenceScript = otherCollider.getComponent(Fence);
        const doorScript = otherCollider.node.parent?.getComponent(DoorController);

        if (fenceScript || doorScript) {
            this.isMoving = true;
            this.isAttacking = false;
            this.targetFenceScript = null;
            this.targetDoorScript = null;
            this.unscheduleAllCallbacks();
            this.setAnimation();
        }
    }

    startAttackCycle() {
        if (this.isDead || !this.isAttacking) return;

        if ((!this.targetFenceScript || !this.targetFenceScript.isValid) &&
            (!this.targetDoorScript || !this.targetDoorScript.isValid))
        {
            this.onEndContact(null!, null!, null); // Giả lập event kết thúc va chạm
            return;
        }

        this.spine.setAnimation(0, "attack_melee_1", false);

        this.scheduleOnce(() => {
            if (this.isAttacking && !this.isDead) {
                this.targetFenceScript?.takeDamage(this.damage);
                this.targetDoorScript?.takeDamage(this.damage);
            }
        }, 0.3);

        this.spine.setCompleteListener(() => {
            if (this.isDead || !this.isAttacking) return;

            this.spine.setAnimation(0, "idle", true);
            this.scheduleOnce(() => {
                if (!this.isDead && this.isAttacking) {
                    this.startAttackCycle();
                }
            }, 0.2);
        });
    }


    public showUltimateTargetEffect() {
        if (!this.ultimateTargetEffectPrefab) {
            console.warn("Chưa gán Prefab hiệu ứng cho Goblin:", this.node.name);
            return;
        }
        const effect = instantiate(this.ultimateTargetEffectPrefab);
        this.node.addChild(effect);
        effect.setPosition(0, 0, 0);
        effect.setSiblingIndex(0);
    }
    
    public die() {
        if (this.isDead) return;
        this.isDead = true;
        this.isMoving = false;
        this.isAttacking = false;
        this.unscheduleAllCallbacks();

        if (this.rubyPrefab) {
            const rubyNode = instantiate(this.rubyPrefab);
            this.node.parent?.addChild(rubyNode);
            rubyNode.setWorldPosition(this.node.worldPosition);
            RubyManager.instance.addRuby(rubyNode);
        }

        this.spine.color = Color.RED;
        this.scheduleOnce(() => {
            if (this.spine && this.spine.isValid) {
                this.spine.color = Color.WHITE;
            }
        }, 0.1);


        this.spine.setAnimation(0, "die", false);
        this.spine.setCompleteListener((trackEntry) => {
            if (trackEntry.animation.name === "die") {
                this.node.destroy();
            }
        });
    }

    setAnimation() {
        if (this.isDead || this.isAttacking) return;

        const currentAnim = this.spine.getCurrent(0)?.animation?.name;

        if (this.isActivated && this.isMoving) {
            if (currentAnim !== "run") {
                this.spine.setAnimation(0, "run", true);
            }
        } else {
            if (currentAnim !== "idle") {
                this.spine.setAnimation(0, "idle", true);
            }
        }
    }
}