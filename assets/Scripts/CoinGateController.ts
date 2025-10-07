// File: CoinGateController.ts
import { _decorator, Component, Node, Label, Collider2D, Contact2DType, IPhysics2DContact, tween, v3, easing, CCFloat, macro, Vec3 } from 'cc';
import { PlayerSpine } from "db://assets/Scripts/Player/PlayerSpine";
import { GameManager } from "db://assets/Scripts/GameManager";
import { GateManager } from "db://assets/Scripts/GateManager";

const { ccclass, property } = _decorator;

@ccclass('CoinGateController')
export class CoinGateController extends Component {

    @property(Label)
    public costLabel: Label = null!;

    @property(Node)
    public arrowNode: Node = null!;

    @property({ type: CCFloat, min: 0.01 })
    public drainInterval: number = 0.05;

    @property({ group: { name: "Curved Fly Effect", id: "CFE" }, type: CCFloat, tooltip: "Thời gian bay của một đồng Coin." })
    public flyDuration: number = 0.4;

    @property({ group: { name: "Curved Fly Effect", id: "CFE" }, type: CCFloat, tooltip: "Độ cao tối đa của đường cong." })
    public maxFlyHeight: number = 100; // Tăng giá trị mặc định để dễ thấy hơn

    // --- Private Variables ---
    private requiredCoins: number = 0;
    private isUnlocked: boolean = false;
    private isDraining: boolean = false;
    private playerScript: PlayerSpine = null;
    private spawnPoint: Node = null;

    public initialize(point: Node, cost: number) {
        this.spawnPoint = point;
        this.requiredCoins = cost;
        this.updateCostLabel();
    }

    onLoad() {
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        }
    }

    start() {
        if (this.arrowNode) {
            this.animateArrow();
        }
        if (!this.spawnPoint) {
            console.warn(`Cổng "${this.node.name}" chưa được gán spawnPoint và cost thông qua hàm initialize()!`);
        }
    }

    private animateArrow() {
        const startPos = this.arrowNode.getPosition();
        const endPos = v3(startPos.x, startPos.y - 15, startPos.z);
        tween(this.arrowNode)
            .to(0.7, { position: endPos }, { easing: 'quadInOut' })
            .to(0.7, { position: startPos }, { easing: 'quadInOut' })
            .union()
            .repeatForever()
            .start();
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (this.isUnlocked || this.isDraining) return;
        const player = otherCollider.getComponent(PlayerSpine);
        if (player) {
            this.playerScript = player;
            this.startCoinDrain();
        }
    }

    private onEndContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (otherCollider.getComponent(PlayerSpine)) {
            this.stopCoinDrain();
            this.playerScript = null;
        }
    }

    private startCoinDrain() {
        if (this.isDraining) return;
        this.isDraining = true;
        this.schedule(this.drainOneCoin, this.drainInterval, macro.REPEAT_FOREVER, 0);
    }

    private stopCoinDrain() {
        if (!this.isDraining) return;
        this.isDraining = false;
        this.unschedule(this.drainOneCoin);
    }

    private drainOneCoin() {
        if (this.requiredCoins <= 0 || !this.playerScript || this.playerScript.getCollectedCoinCount() <= 0) {
            this.stopCoinDrain();
            if (this.requiredCoins <= 0) {
                this.onUnlockSuccess();
            }
            return;
        }
        this.flyCoinFromPlayerAndUpdateState();
    }

    /**
     * ✅ CẬP NHẬT LỚN: Sử dụng phương pháp tween một đối tượng giả lập để đảm bảo đường cong ổn định.
     */
    private flyCoinFromPlayerAndUpdateState() {
        if (!this.playerScript) return;

        const coinNode = this.playerScript.takeTopCoin();

        if (coinNode) {
            GameManager.instance.addCoins(-1);
            this.requiredCoins--;
            this.updateCostLabel();

            coinNode.parent = this.node.scene;
            const startPos = coinNode.worldPosition.clone();
            const endPos = this.node.worldPosition.clone();

            // Tạo một đối tượng giả lập để tween giá trị 'ratio'
            const tweenTarget = { ratio: 0 };

            tween(tweenTarget)
                .to(this.flyDuration, { ratio: 1 }, {
                    easing: easing.linear, // Để ratio tăng đều
                    onUpdate: () => {
                        if (!coinNode.isValid) return; // Dừng lại nếu coin đã bị hủy

                        const ratio = tweenTarget.ratio;

                        // Tính toán vị trí X và Z theo đường thẳng
                        const newX = startPos.x + (endPos.x - startPos.x) * ratio;
                        const newZ = startPos.z + (endPos.z - startPos.z) * ratio;

                        // Tính toán vị trí Y (chiều cao) theo đường cong parabol
                        const heightOffset = this.maxFlyHeight * (ratio * (1 - ratio) * 4);
                        const newY = startPos.y + (endPos.y - startPos.y) * ratio + heightOffset;

                        coinNode.setWorldPosition(newX, newY, newZ);
                    }
                })
                .call(() => {
                    if (coinNode.isValid) {
                        coinNode.destroy();
                    }
                })
                .start();
        } else {
            this.stopCoinDrain();
        }
    }

    private onUnlockSuccess() {
        this.isUnlocked = true;
        if (this.spawnPoint && GateManager.instance) {
            GateManager.instance.onGateUnlocked(this.spawnPoint);
        }
        tween(this.node)
            .to(0.5, { scale: v3(0, 0, 0) }, { easing: 'backIn' })
            .call(() => {
                this.node.destroy();
            })
            .start();
    }

    private updateCostLabel() {
        if (this.costLabel) {
            this.costLabel.string = `${this.requiredCoins}`;
        }
    }
}