import { _decorator, Component, Node, Color, Sprite, Collider2D, Contact2DType, IPhysics2DContact, Vec3 } from 'cc';
import { PlayerSpine } from "db://assets/Scripts/Player/PlayerSpine";

const { ccclass, property } = _decorator;

@ccclass('DropZoneController')
export class DropZoneController extends Component {
    @property({
        type: Color,
        tooltip: "Màu sắc của ô vuông khi người chơi đi vào."
    })
    public activeColor: Color = Color.GREEN;

    @property({
        group: 'Ruby Placement',
        tooltip: "Vị trí của cột Ruby đầu tiên, tính từ tâm của DropZone."
    })
    public column1_Offset: Vec3 = new Vec3(-30, 10, 0);

    @property({
        group: 'Ruby Placement',
        tooltip: "Vị trí của cột Ruby thứ hai, tính từ tâm của DropZone."
    })
    public column2_Offset: Vec3 = new Vec3(30, 10, 0);

    @property({
        group: 'Ruby Placement',
        tooltip: "Khoảng cách giữa các viên Ruby trong một cột."
    })
    public rubySpacing: number = 10;

    private sprite: Sprite = null!;
    private originalColor: Color = null!;

    private rubyCountCol1: number = 0;
    private rubyCountCol2: number = 0;
    private placedRubies: Node[] = [];

    onLoad() {
        this.sprite = this.getComponent(Sprite);
        if (this.sprite) {
            this.originalColor = this.sprite.color.clone();
        }

        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        }
    }

    // 🔥 HÀM MỚI ĐƯỢC THÊM VÀO 🔥
    /**
     * Reset các biến đếm vị trí khi bàn trống.
     */
    private resetPlacementCounters(): void {
        this.rubyCountCol1 = 0;
        this.rubyCountCol2 = 0;
        console.log("Bàn đã trống, reset vị trí đặt Ruby.");
    }

    public getNextPlacementPosition(): Vec3 {
        // --- PHẦN NÀY GIỮ NGUYÊN, KHÔNG THAY ĐỔI ---
        let targetPosition = new Vec3();
        // Sử dụng ma trận để tính toán chính xác, tránh lỗi khi xoay/scale
        const targetLocalPosition = new Vec3();

        if (this.rubyCountCol1 <= this.rubyCountCol2) {
            targetLocalPosition.set(
                this.column1_Offset.x,
                this.column1_Offset.y + (this.rubyCountCol1 * this.rubySpacing),
                this.column1_Offset.z
            );
            this.rubyCountCol1++;
        } else {
            targetLocalPosition.set(
                this.column2_Offset.x,
                this.column2_Offset.y + (this.rubyCountCol2 * this.rubySpacing),
                this.column2_Offset.z
            );
            this.rubyCountCol2++;
        }

        Vec3.transformMat4(targetPosition, targetLocalPosition, this.node.worldMatrix);
        return targetPosition;
    }

    public registerPlacedRuby(rubyNode: Node) {
        this.placedRubies.push(rubyNode);
        rubyNode.setParent(this.node);
    }

    public hasRubies(): boolean {
        return this.placedRubies.length > 0;
    }

    // 🔥 HÀM NÀY ĐÃ ĐƯỢC SỬA LẠI 🔥
    /**
     * Dành cho người mua lấy một viên Ruby.
     */
    public takeRuby(): Node | null {
        if (this.placedRubies.length > 0) {
            const rubyToTake = this.placedRubies.pop();
            if (rubyToTake) {
                rubyToTake.destroy();
            }

            // KIỂM TRA NẾU BÀN ĐÃ TRỐNG THÌ RESET BIẾN ĐẾM
            if (this.placedRubies.length === 0) {
                this.resetPlacementCounters();
            }

            return rubyToTake;
        }
        return null;
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (otherCollider.getComponent(PlayerSpine)) {
            if (this.sprite) {
                this.sprite.color = this.activeColor;
            }
        }
    }

    private onEndContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (otherCollider.getComponent(PlayerSpine)) {
            if (this.sprite) {
                this.sprite.color = this.originalColor;
            }
        }
    }
}