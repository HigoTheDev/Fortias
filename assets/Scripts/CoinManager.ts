// File: CoinManager.ts
import { _decorator, Component, Node, Vec3, Collider2D, Contact2DType, IPhysics2DContact } from 'cc';
import { CoinController } from './CoinController';
import { PlayerSpine } from "db://assets/Scripts/Player/PlayerSpine";
const { ccclass, property } = _decorator;
@ccclass('CoinManager')
export class CoinManager extends Component {
    @property({ type: Node })
    stackOrigin: Node = null!;
    @property
    coinSpacingY: number = 15;
    @property
    columnSpacingX: number = 25;
    @property
    coinsPerColumn: number = 10;

    private static _instance: CoinManager;
    public static get instance(): CoinManager { return this._instance; }

    private stackedCoins: Node[] = [];
    private isCollecting: boolean = false;

    onLoad() {
        if (CoinManager._instance) { this.destroy(); return; }
        CoinManager._instance = this;

        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (this.isCollecting) return;
        const player = otherCollider.getComponent(PlayerSpine);
        if (player) {
            this.collectAllCoins(player);
        }
    }

    /**
     * Thay vì hủy xu, bây giờ sẽ gọi hàm receiveCoin của Player
     */
    private collectAllCoins(player: PlayerSpine) {
        if (this.stackedCoins.length === 0) return;
        this.isCollecting = true;
        const playerNode = player.node;

        for (let i = 0; i < this.stackedCoins.length; i++) {
            const coinNode = this.stackedCoins[i];
            const coinController = coinNode.getComponent(CoinController);

            if (coinController) {
                this.scheduleOnce(() => {
                    const onCoinArrived = () => {
                        player.receiveCoin(coinNode);
                    };
                    coinController.moveTo(playerNode.worldPosition, onCoinArrived);
                }, i * 0.05);
            }
        }
        this.stackedCoins = [];
        this.scheduleOnce(() => { this.isCollecting = false; }, 2.0);
    }

    public addCoinToStack(coinNode: Node) {
        const coinController = coinNode.getComponent(CoinController);
        const targetPosition = this.calculateNextPosition();
        this.stackedCoins.push(coinNode);
        if (coinController) {
            coinController.moveTo(targetPosition);
        } else {
            coinNode.setWorldPosition(targetPosition);
        }
    }

    private calculateNextPosition(): Vec3 {
        const stackIndex = this.stackedCoins.length;
        const originPos = this.stackOrigin.worldPosition;
        if (stackIndex >= this.coinsPerColumn * 2) {
            const lastPos = this.stackedCoins[this.stackedCoins.length - 1].worldPosition.clone();
            lastPos.z -= 1;
            return lastPos;
        }
        const col = stackIndex % 2;
        const row = Math.floor(stackIndex / 2);
        const targetPos = new Vec3(
            originPos.x + (col * this.columnSpacingX),
            originPos.y + (row * this.coinSpacingY),
            originPos.z
        );
        return targetPos;
    }
}