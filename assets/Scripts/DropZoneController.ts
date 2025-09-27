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

    // Biến đếm cho mỗi cột
    private rubyCountCol1: number = 0;
    private rubyCountCol2: number = 0;

    // Mảng quản lý các viên Ruby đã được đặt để người mua lấy
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

    /**
     * ✅ HÀM CẦN THIẾT SỐ 1
     * Tính toán và trả về vị trí tiếp theo để đặt Ruby.
     */
    public getNextPlacementPosition(): Vec3 {
        let targetPosition = new Vec3();
        let basePosition = this.node.worldPosition;

        if (this.rubyCountCol1 <= this.rubyCountCol2) {
            targetPosition.set(
                basePosition.x + this.column1_Offset.x,
                basePosition.y + this.column1_Offset.y + (this.rubyCountCol1 * this.rubySpacing),
                basePosition.z
            );
            this.rubyCountCol1++;
        } else {
            targetPosition.set(
                basePosition.x + this.column2_Offset.x,
                basePosition.y + this.column2_Offset.y + (this.rubyCountCol2 * this.rubySpacing),
                basePosition.z
            );
            this.rubyCountCol2++;
        }

        return targetPosition;
    }

    /**
     * ✅ HÀM CẦN THIẾT SỐ 2
     * Player gọi hàm này sau khi đặt Ruby để bàn "biết" về sự tồn tại của nó.
     */
    public registerPlacedRuby(rubyNode: Node) {
        this.placedRubies.push(rubyNode);
        rubyNode.setParent(this.node); // Đặt ruby làm con của DropZone để quản lý
    }

    /**
     * Dành cho người mua kiểm tra xem còn Ruby không.
     */
    public hasRubies(): boolean {
        return this.placedRubies.length > 0;
    }

    /**
     * Dành cho người mua lấy một viên Ruby.
     */
    public takeRuby(): Node | null {
        if (this.placedRubies.length > 0) {
            const rubyToTake = this.placedRubies.pop();
            if (rubyToTake) {
                rubyToTake.destroy();
            }
            return rubyToTake;
        }
        return null;
    }

    // ----- Các hàm xử lý va chạm và đổi màu -----
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