import { _decorator, Component, Node, Vec3, Prefab, instantiate, sp, Label, Sprite, CCInteger, randomRangeInt } from 'cc';
import { BuyerManager } from './BuyerManager';
import { DropZoneController } from './DropZoneController';
import { CoinManager } from './CoinManager';

const { ccclass, property } = _decorator;

enum BuyerState {
    MOVING,
    WAITING,
    BUYING,
}

@ccclass('BuyerController')
export class BuyerController extends Component {
    // --- Animation Properties ---
    @property({ type: sp.Skeleton, tooltip: "Component Spine Animation của Buyer." })
    spine: sp.Skeleton = null!;

    // --- Movement Properties ---
    @property
    moveSpeed: number = 100;

    // --- UI Properties for Request Dialog ---
    @property({ type: Node, tooltip: "Node gốc chứa toàn bộ hộp thoại yêu cầu." })
    public requestDialog: Node = null!;

    @property({ type: Label, tooltip: "Nhãn hiển thị số lượng Ruby (vd: 7)." })
    public countLabel: Label = null!;

    @property({ type: Node, tooltip: "Icon Ruby trong hộp thoại." })
    public rubyIcon: Node = null!;

    @property({ type: Sprite, tooltip: "Sprite màu xanh để hiển thị tiến độ." })
    public fillSprite: Sprite = null!;

    @property({ type: Node, tooltip: "Icon dấu tích khi hoàn thành." })
    public checkmarkIcon: Node = null!;

    // --- Logic Properties ---
    @property({ type: CCInteger, min: 2, tooltip: "Số Ruby ít nhất mà Buyer có thể yêu cầu." })
    public minRubyRequest: number = 2;

    @property({ type: CCInteger, min: 2, tooltip: "Số Ruby nhiều nhất mà Buyer có thể yêu cầu." })
    public maxRubyRequest: number = 5;

    // --- Private State Variables ---
    private state: BuyerState = BuyerState.MOVING;
    private manager: BuyerManager = null!;
    private tableDropZone: DropZoneController = null!;
    private patrolPoints: Node[] = [];
    private currentTarget: Vec3 = null!;
    private currentStage: 'QUEUE' | 'EXIT' = 'QUEUE';
    private isAtFront: boolean = false;
    private originalScaleX: number = 1;
    private coinPrefab: Prefab = null!;

    private rubiesToBuy: number = 0;
    private totalRubiesRequired: number = 0;
    private isRequestComplete: boolean = false;

    start() {
        this.originalScaleX = this.node.scale.x;
    }

    public init(manager: BuyerManager, points: Node[], table: DropZoneController, coinPrefab: Prefab, skinName: string) {
        this.manager = manager;
        this.patrolPoints = points;
        this.tableDropZone = table;
        this.coinPrefab = coinPrefab;

        this.totalRubiesRequired = randomRangeInt(this.minRubyRequest, this.maxRubyRequest + 1);
        this.rubiesToBuy = this.totalRubiesRequired;
        this.isRequestComplete = false;

        if (this.spine) {
            this.spine.setSkin(skinName);
        } else {
            console.error("Chưa gán Spine component cho BuyerController!");
        }

        if (this.requestDialog) {
            this.requestDialog.active = false;
            this.fillSprite.node.active = true;
            this.rubyIcon.active = true;
            this.countLabel.node.active = true;
            this.updateDialogUI();
        }
    }

    public moveTo(targetPos: Vec3, isAtFront: boolean) {
        this.currentTarget = targetPos;
        this.isAtFront = isAtFront;
        this.state = BuyerState.MOVING;
        this.currentStage = 'QUEUE';
    }

    public continuePatrol() {
        if (this.requestDialog) {
            this.requestDialog.active = false;
        }
        this.currentStage = 'EXIT';
        this.currentTarget = this.patrolPoints[1].worldPosition;
        this.state = BuyerState.MOVING;
    }

    update(deltaTime: number) {
        if (this.state !== BuyerState.MOVING || !this.currentTarget) {
            return;
        }
        if (Vec3.distance(this.node.worldPosition, this.currentTarget) < 5) {
            this.handleArrival();
        } else {
            this.moveTowards(this.currentTarget, deltaTime);
        }
    }

    private handleArrival() {
        this.node.setWorldPosition(this.currentTarget);
        this.state = BuyerState.WAITING;
        this.spine.setAnimation(0, 'idle', true);

        if (this.currentStage === 'QUEUE') {
            if (this.isAtFront) {
                if (this.requestDialog) {
                    this.requestDialog.active = true;
                }
                this.startBuying();
            }
        } else {
            if (this.currentTarget.equals(this.patrolPoints[1].worldPosition)) {
                this.currentTarget = this.patrolPoints[2].worldPosition;
                this.state = BuyerState.MOVING;
            } else if (this.currentTarget.equals(this.patrolPoints[2].worldPosition)) {
                // ✅ ĐÃ SỬA LỖI: Gọi hàm không có tham số để khớp với BuyerManager.ts
                this.manager.onBuyerLeftScene();
                this.node.destroy();
            }
        }
    }

    private startBuying() {
        this.isAtFront = false;
        this.state = BuyerState.BUYING;
        this.buyingLoop();
    }

    private buyingLoop() {
        if (this.isRequestComplete || this.rubiesToBuy <= 0) {
            this.completeRequest();
            return;
        }

        if (this.tableDropZone.hasRubies()) {
            const rubyNode = this.tableDropZone.takeRuby();
            if (rubyNode) {
                rubyNode.destroy();
            }

            this.rubiesToBuy--;
            this.updateDialogUI();

            this.scheduleOnce(() => { this.buyingLoop(); }, 0.25);
        } else {
            this.scheduleOnce(() => {
                if (this.state === BuyerState.BUYING) {
                    this.buyingLoop();
                }
            }, 2.0);
        }
    }

    private spawnCoins() {
        if (!this.coinPrefab || !CoinManager.instance) return;

        const createCoin = (delay: number) => {
            this.scheduleOnce(() => {
                if (!this.isValid) return;
                const coin = instantiate(this.coinPrefab);
                CoinManager.instance.node.addChild(coin);
                coin.setWorldPosition(this.node.worldPosition);
                CoinManager.instance.addCoinToStack(coin);
            }, delay);
        };

        for (let i = 0; i < this.totalRubiesRequired; i++) {
            createCoin(i * 0.1);
        }
    }

    private moveTowards(targetPos: Vec3, deltaTime: number) {
        this.spine.setAnimation(0, 'run', true);
        const direction = new Vec3();
        Vec3.subtract(direction, targetPos, this.node.worldPosition);
        direction.normalize();

        if (this.currentStage === 'QUEUE') {
            if (direction.x < 0) this.node.setScale(-this.originalScaleX, this.node.scale.y, this.node.scale.z);
            else this.node.setScale(this.originalScaleX, this.node.scale.y, this.node.scale.z);
        } else {
            if (direction.x > 0) this.node.setScale(this.originalScaleX, this.node.scale.y, this.node.scale.z);
            else if (direction.x < 0) this.node.setScale(-this.originalScaleX, this.node.scale.y, this.node.scale.z);
        }

        this.node.translate(direction.multiplyScalar(this.moveSpeed * deltaTime));
    }

    private updateDialogUI(): void {
        if (!this.requestDialog || this.isRequestComplete) return;

        this.rubyIcon.active = true;
        this.countLabel.node.active = true;
        this.checkmarkIcon.active = false;
        this.fillSprite.node.active = true;

        this.countLabel.string = `${this.totalRubiesRequired}`;

        const rubiesBought = this.totalRubiesRequired - this.rubiesToBuy;
        const fillRatio = rubiesBought / this.totalRubiesRequired;
        this.fillSprite.fillRange = fillRatio;
    }

    private completeRequest(): void {
        if (this.isRequestComplete) return;
        this.isRequestComplete = true;

        if (this.requestDialog) {
            this.rubyIcon.active = false;
            this.countLabel.node.active = false;
            this.fillSprite.node.active = false;
            this.checkmarkIcon.active = true;
        }

        this.spine.setAnimation(0, 'win', false);
        this.spine.addAnimation(0, 'idle', true);

        this.spawnCoins();

        this.scheduleOnce(() => {
            this.manager.onBuyerFinishedShopping(this.node);
        }, 1.5);
    }
}