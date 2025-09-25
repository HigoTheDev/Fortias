// Tên file: BuyerManager.ts
import { _decorator, Component, Node, Prefab, instantiate, Vec3 } from 'cc';
import { BuyerController } from './BuyerController';
import { DropZoneController } from './DropZoneController';

const { ccclass, property } = _decorator;

@ccclass('BuyerManager')
export class BuyerManager extends Component {

    @property({ type: Prefab, tooltip: "Prefab của người mua hàng" })
    buyerPrefab: Prefab = null!;

    @property({ type: Node, tooltip: "Vị trí xếp hàng/mua hàng" })
    queuePoint: Node = null!;

    @property({ type: Node, tooltip: "Nơi người mua sẽ xuất hiện" })
    spawnPoint: Node = null!;

    @property({ type: Node, tooltip: "Nơi người mua sẽ biến mất" })
    exitPoint: Node = null!;

    @property({ type: DropZoneController, tooltip: "Cái bàn nơi người chơi đặt Ruby" })
    tableDropZone: DropZoneController = null!;

    @property({ tooltip: "Số lượng người mua tối đa trong cảnh" })
    maxBuyers: number = 5;

    private activeBuyers: Node[] = [];

    start() {
        // Tạo ra một vài người mua ban đầu
        for (let i = 0; i < this.maxBuyers; i++) {
            this.spawnNewBuyer();
        }
    }

    // Được gọi bởi BuyerController khi một người mua đã mua xong và rời đi
    public onBuyerFinished(buyerNode: Node) {
        // Xóa người mua đã xong khỏi danh sách quản lý
        const index = this.activeBuyers.indexOf(buyerNode);
        if (index > -1) {
            this.activeBuyers.splice(index, 1);
        }

        // Tạo ra một người mua mới để thay thế
        this.spawnNewBuyer();
    }

    private spawnNewBuyer() {
        if (!this.buyerPrefab || this.activeBuyers.length >= this.maxBuyers) {
            return;
        }

        const newBuyer = instantiate(this.buyerPrefab);
        this.node.addChild(newBuyer);
        newBuyer.setWorldPosition(this.spawnPoint.worldPosition);

        this.activeBuyers.push(newBuyer);

        // Lấy script và khởi tạo thông tin cho người mua
        const buyerController = newBuyer.getComponent(BuyerController);
        if (buyerController) {
            buyerController.init(
                this,
                this.queuePoint.worldPosition,
                this.exitPoint.worldPosition,
                this.tableDropZone
            );
        }
    }
}