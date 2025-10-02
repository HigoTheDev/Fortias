// File: CoinGateController.ts (Đã sửa lỗi tham số)
import { _decorator, Component, Node, Label, Collider2D, Contact2DType, IPhysics2DContact, CCInteger, randomRangeInt, tween, v3, easing, CCFloat } from 'cc';
import { PlayerSpine } from "db://assets/Scripts/Player/PlayerSpine";
import { GameManager } from "db://assets/Scripts/GameManager";
import { CoinController } from "db://assets/Scripts/CoinController";
import { GateManager } from "db://assets/Scripts/GateManager";

const { ccclass, property } = _decorator;

@ccclass('CoinGateController')
export class CoinGateController extends Component {

    @property(Label)
    public costLabel: Label = null!;

    @property(Node)
    public arrowNode: Node = null!;

    @property({ type: CCInteger, min: 1 })
    public minCost: number = 10;

    @property({ type: CCInteger, min: 1 })
    public maxCost: number = 50;

    @property({ type: CCFloat, min: 0.01 })
    public drainInterval: number = 0.05;

    // --- Private Variables ---
    private requiredCoins: number = 0;
    private isUnlocked: boolean = false;
    private isDraining: boolean = false;
    private playerScript: PlayerSpine = null;
    private spawnPoint: Node = null;

    public setSpawnPoint(point: Node) {
        this.spawnPoint = point;
    }

    onLoad() {
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        }
    }

    start() {
        this.requiredCoins = randomRangeInt(this.minCost, this.maxCost + 1);
        this.updateCostLabel();
        if (this.arrowNode) {
            this.animateArrow();
        }
        if (!this.spawnPoint) {
            console.warn(`Cổng tại node "${this.node.name}" không được gán spawnPoint! Nó sẽ không thể hoạt động đúng.`);
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
        this.schedule(this.drainOneCoin, this.drainInterval);
    }

    private stopCoinDrain() {
        if (!this.isDraining) return;
        this.isDraining = false;
        this.unschedule(this.drainOneCoin);
    }

    private drainOneCoin() {
        if (this.requiredCoins <= 0 || GameManager.instance.getCurrentCoins() <= 0) {
            this.stopCoinDrain();
            if (this.requiredCoins <= 0) {
                this.onUnlockSuccess();
            }
            return;
        }

        this.flyCoinFromPlayer();
        GameManager.instance.addCoins(-1);
        this.requiredCoins--;
        this.updateCostLabel();
    }

    private flyCoinFromPlayer() {
        if (!this.playerScript) return;
        const coinNode = this.playerScript.takeTopCoin();
        if (coinNode) {
            const targetPos = this.node.worldPosition;
            const coinController = coinNode.getComponent(CoinController);
            if (coinController) {
                coinController.moveTo(targetPos, () => {
                    coinNode.destroy();
                });
            } else {
                coinNode.destroy();
            }
        }
    }

    private onUnlockSuccess() {
        this.isUnlocked = true;

        // ✅ SỬA LỖI TẠI ĐÂY:
        // Truyền `this.spawnPoint` làm tham số khi gọi hàm.
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