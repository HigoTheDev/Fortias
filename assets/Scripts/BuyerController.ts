// Tên file: BuyerController.ts
import { _decorator, Component, Node, Vec3, tween } from 'cc';
import { BuyerManager } from './BuyerManager';
import { DropZoneController } from './DropZoneController';

const { ccclass, property } = _decorator;

// Các trạng thái của người mua
enum BuyerState {
    MOVING_TO_TABLE, // Đang đi tới bàn
    BUYING,          // Đang mua hàng
    LEAVING          // Đang rời đi
}

@ccclass('BuyerController')
export class BuyerController extends Component {

    @property
    moveSpeed: number = 100;

    private state: BuyerState = BuyerState.MOVING_TO_TABLE;
    private manager: BuyerManager = null!;
    private tablePosition: Vec3 = null!;
    private exitPosition: Vec3 = null!;
    private tableDropZone: DropZoneController = null!;
    private originalScaleX: number = 1;

    start() {
        this.originalScaleX = this.node.scale.x;
    }

    // Hàm này được gọi bởi BuyerManager để khởi tạo thông tin cần thiết
    public init(manager: BuyerManager, tablePos: Vec3, exitPos: Vec3, table: DropZoneController) {
        this.manager = manager;
        this.tablePosition = tablePos;
        this.exitPosition = exitPos;
        this.tableDropZone = table;
    }

    update(deltaTime: number) {
        if (!this.manager) return;

        let targetPos: Vec3 = null!;

        // Xác định vị trí mục tiêu dựa trên trạng thái hiện tại
        if (this.state === BuyerState.MOVING_TO_TABLE) {
            targetPos = this.tablePosition;
        } else if (this.state === BuyerState.LEAVING) {
            targetPos = this.exitPosition;
        }

        // Nếu có mục tiêu, di chuyển đến đó
        if (targetPos) {
            const direction = new Vec3();
            Vec3.subtract(direction, targetPos, this.node.worldPosition);

            // Quay mặt về hướng di chuyển
            if (direction.x > 0) {
                this.node.setScale(this.originalScaleX, this.node.scale.y, this.node.scale.z);
            } else if (direction.x < 0) {
                this.node.setScale(-this.originalScaleX, this.node.scale.y, this.node.scale.z);
            }

            direction.normalize();

            const distance = Vec3.distance(this.node.worldPosition, targetPos);
            // Khi đến đủ gần, xử lý logic tiếp theo
            if (distance < 5) {
                this.handleArrival();
                return;
            }

            // Di chuyển node
            this.node.translate(direction.multiplyScalar(this.moveSpeed * deltaTime));
        }
    }

    // Xử lý khi người mua đến được vị trí mục tiêu
    private handleArrival() {
        if (this.state === BuyerState.MOVING_TO_TABLE) {
            this.startBuying();
        } else if (this.state === BuyerState.LEAVING) {
            // Báo cho manager biết đã hoàn thành
            this.manager.onBuyerFinished(this.node);
            // Tự hủy
            this.node.destroy();
        }
    }

    // Bắt đầu chu trình mua hàng
    private startBuying() {
        this.state = BuyerState.BUYING;

        // Kiểm tra xem trên bàn có Ruby không
        if (this.tableDropZone.hasRubies()) {
            // Giả lập thời gian mua hàng (1 giây)
            this.scheduleOnce(() => {
                this.tableDropZone.takeRuby(); // Lấy 1 viên Ruby
                this.state = BuyerState.LEAVING; // Bắt đầu rời đi
            }, 1.0);
        } else {
            // Nếu không có Ruby, đợi 2 giây rồi kiểm tra lại
            this.scheduleOnce(() => {
                // Đảm bảo rằng vẫn đang trong trạng thái mua hàng trước khi thử lại
                if(this.state === BuyerState.BUYING) {
                    this.startBuying();
                }
            }, 2.0);
        }
    }
}