import { _decorator, Component, Node, Color, Sprite, Collider2D, Contact2DType, IPhysics2DContact, Vec3 } from 'cc';
import { PlayerSpine } from "./Player/PlayerSpine"; // Sửa lại đường dẫn đến file PlayerSpine của bạn nếu cần

const { ccclass, property } = _decorator;

@ccclass('DropZoneController')
export class DropZoneController extends Component {
    @property({ type: Color, tooltip: "Màu sắc của ô vuông khi người chơi đi vào." })
    public activeColor: Color = new Color(144, 255, 144, 255); // Màu xanh lá cây

    @property({ group: 'Ruby Placement', tooltip: "Vị trí của cột Ruby đầu tiên, tính từ tâm của DropZone." })
    public column1_Offset: Vec3 = new Vec3(-30, 10, 0);

    @property({ group: 'Ruby Placement', tooltip: "Vị trí của cột Ruby thứ hai, tính từ tâm của DropZone." })
    public column2_Offset: Vec3 = new Vec3(30, 10, 0);

    @property({ group: 'Ruby Placement', tooltip: "Khoảng cách giữa các viên Ruby trong một cột." })
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

    private resetPlacementCounters(): void {
        this.rubyCountCol1 = 0;
        this.rubyCountCol2 = 0;
    }

    public getNextPlacementPosition(): Vec3 {
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

        const worldPosition = new Vec3();
        Vec3.transformMat4(worldPosition, targetLocalPosition, this.node.worldMatrix);
        return worldPosition;
    }

    /**
     * ✅ ĐÃ CẢI TIẾN: Chống lỗi "nhảy" vị trí của Ruby.
     * Hàm này sẽ đảm bảo Ruby nằm đúng chỗ sau khi đổi parent.
     */
    public registerPlacedRuby(rubyNode: Node) {
        // Lưu lại vị trí thế giới của Ruby TRƯỚC KHI đổi parent
        const worldPos = rubyNode.worldPosition.clone();

        // Đổi parent
        rubyNode.setParent(this.node);

        // Ép nó về lại đúng vị trí thế giới đó sau khi đã đổi parent
        rubyNode.setWorldPosition(worldPos);

        this.placedRubies.push(rubyNode);
    }

    public hasRubies(): boolean {
        return this.placedRubies.length > 0;
    }

    /**
     * ✅ ĐÃ SỬA LỖI LOGIC: Đếm ngược số Ruby chính xác.
     * Giúp cho việc đặt Ruby mới không bị chồng chéo lên Ruby cũ.
     */
    public takeRuby(): Node | null {
        if (this.hasRubies()) {
            const rubyToTake = this.placedRubies.pop();

            // Logic mới: Giảm biến đếm của cột cao hơn, vì đó là cột
            // chứa viên Ruby được đặt xuống sau cùng.
            if (this.rubyCountCol1 > this.rubyCountCol2) {
                this.rubyCountCol1--;
            } else {
                this.rubyCountCol2--;
            }

            if (this.placedRubies.length === 0) {
                this.resetPlacementCounters();
            }
            return rubyToTake;
        }
        return null;
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        const player = otherCollider.getComponent(PlayerSpine);
        if (player) {
            if (this.sprite) {
                this.sprite.color = this.activeColor;
            }
            // Ra lệnh cho Player thả Ruby xuống bàn
            player.dropOffRubies(this);
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