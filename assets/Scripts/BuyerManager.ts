// File: BuyerManager.ts
import { _decorator, Component, Node, Prefab, instantiate, Vec3 } from 'cc';
import { BuyerController } from './BuyerController';
import { DropZoneController } from './DropZoneController';

const { ccclass, property } = _decorator;

@ccclass('BuyerManager')
export class BuyerManager extends Component {
    @property({ type: Prefab })
    buyerPrefab: Prefab = null!;

    /**
     * ✅ THAY ĐỔI SỐ 1: Thêm thuộc tính cho Coin Prefab
     * Kéo Prefab đồng xu của bạn vào đây trong Inspector.
     */
    @property({ type: Prefab, tooltip: "Prefab của đồng xu sẽ rơi ra khi mua hàng." })
    coinPrefab: Prefab = null!;

    @property({ type: DropZoneController })
    tableDropZone: DropZoneController = null!;

    @property({ type: [Node], tooltip: "Element 0: P2 (Mua hàng)\nElement 1: P3 (Góc)\nElement 2: P4 (Biến mất)" })
    patrolPoints: Node[] = [];

    @property({ tooltip: "Khoảng cách giữa mỗi người trong hàng." })
    queueSpacing: number = 80;

    @property({ tooltip: "Số người tối đa trong hàng chờ." })
    maxQueueSize: number = 5;

    private shoppingQueue: Node[] = [];

    start() {
        if (!this.coinPrefab) {
            console.error("LỖI CÀI ĐẶT: BuyerManager chưa được gán Coin Prefab!");
            return;
        }
        if (this.patrolPoints.length < 3) {
            console.error("LỖI CÀI ĐẶT: BuyerManager cần ít nhất 3 điểm tuần tra (P2, P3, P4)!");
            return;
        }
        for (let i = 0; i < this.maxQueueSize; i++) {
            this.spawnNewBuyerAtBackOfQueue();
        }
    }

    public onBuyerFinishedShopping(buyerNode: Node) {
        this.shoppingQueue.shift();
        const controller = buyerNode.getComponent(BuyerController);
        if (controller) {
            controller.continuePatrol();
        }
        this.updateQueuePositions();
    }

    public onBuyerLeftScene(buyerNode: Node) {
        this.spawnNewBuyerAtBackOfQueue();
    }

    private spawnNewBuyerAtBackOfQueue() {
        if (this.shoppingQueue.length >= this.maxQueueSize) return;

        const newBuyer = instantiate(this.buyerPrefab);
        const spawnIndex = this.shoppingQueue.length;
        const spawnPosition = this.calculatePositionForQueueIndex(spawnIndex + 2);
        newBuyer.setWorldPosition(spawnPosition);
        this.node.addChild(newBuyer);

        const controller = newBuyer.getComponent(BuyerController);
        if (controller) {
            this.shoppingQueue.push(newBuyer);
            /**
             * ✅ THAY ĐỔI SỐ 2: Truyền coinPrefab vào cho Buyer
             */
            controller.init(this, this.patrolPoints, this.tableDropZone, this.coinPrefab);
            this.updateQueuePositions();
        }
    }

    private updateQueuePositions() {
        for (let i = 0; i < this.shoppingQueue.length; i++) {
            const buyerNode = this.shoppingQueue[i];
            const controller = buyerNode.getComponent(BuyerController);
            const targetPosition = this.calculatePositionForQueueIndex(i);
            const isAtFront = (i === 0);
            controller.moveTo(targetPosition, isAtFront);
        }
    }

    private calculatePositionForQueueIndex(index: number): Vec3 {
        const headOfQueuePos = this.patrolPoints[0].worldPosition;
        const targetPos = new Vec3(
            headOfQueuePos.x + (index * this.queueSpacing),
            headOfQueuePos.y,
            headOfQueuePos.z
        );
        return targetPos;
    }
}