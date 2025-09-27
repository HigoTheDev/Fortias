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

    // 🔥 BỎ: Không cần thuộc tính Sprite ở đây nữa
    // @property({ type: Sprite, ... })
    // public zoneSprite: Sprite = null!;

    @property({ group: 'Ruby Placement', tooltip: "Vị trí của cột Ruby đầu tiên, tính từ tâm của DropZone."})
    public column1_Offset: Vec3 = new Vec3(-30, 50, 0);

    @property({ group: 'Ruby Placement', tooltip: "Vị trí của cột Ruby thứ hai, tính từ tâm của DropZone."})
    public column2_Offset: Vec3 = new Vec3(30, 50, 0);

    @property({ group: 'Ruby Placement', tooltip: "Khoảng cách giữa các viên Ruby trong một cột."})
    public rubySpacing: number = 10;

    private sprite: Sprite = null!; // 🔥 THÊM: Biến sprite nội bộ
    private originalColor: Color = null!;
    private rubyCountCol1: number = 0;
    private rubyCountCol2: number = 0;

    onLoad() {
        // 🔥 SỬA ĐỔI: Tự động lấy component Sprite trên cùng Node này
        this.sprite = this.getComponent(Sprite);

        if (this.sprite) {
            this.originalColor = this.sprite.color.clone();
        } else {
            console.error("Không tìm thấy component Sprite trên Node DropZone!");
        }

        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        }
    }

    // ... (Các hàm còn lại giữ nguyên, nhưng sẽ tham chiếu đến `this.sprite` thay vì `this.zoneSprite`)

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

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (otherCollider.getComponent(PlayerSpine)) {
            if (this.sprite) { this.sprite.color = this.activeColor; }
        }
    }

    private onEndContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (otherCollider.getComponent(PlayerSpine)) {
            if (this.sprite) { this.sprite.color = this.originalColor; }
        }
    }
}