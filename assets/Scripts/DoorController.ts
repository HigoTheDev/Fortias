import { _decorator, Component, Node, Vec3, tween, Collider2D, Contact2DType, IPhysics2DContact, Tween, CCString, Color, Sprite } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('DoorController')
export class DoorController extends Component {

    // --- Thuộc tính Cửa ---
    @property(Node)
    leftDoor: Node = null!;

    @property(Node)
    rightDoor: Node = null!;

    @property({ tooltip: "Góc quay khi cửa mở." })
    openAngle: number = 90;

    @property({ tooltip: "Thời gian hoàn thành animation mở/đóng cửa." })
    duration: number = 0.5;

    @property({ type: CCString, tooltip: "Tên (Name) của node Player." })
    playerName: string = "Fighter";

    // 🔥 THÊM MỚI: Thuộc tính máu cho cửa
    @property({ group: 'Health', tooltip: "Lượng máu tối đa của cửa." })
    maxHP: number = 200;

    private currentHP: number = 0;
    private leftDoorSprite: Sprite | null = null;
    private rightDoorSprite: Sprite | null = null;
    private originalColor: Color = Color.WHITE.clone();


    // --- Biến nội bộ ---
    private _isDoorOpen: boolean = false;
    private _leftDoorTween: Tween<Node> | null = null;
    private _rightDoorTween: Tween<Node> | null = null;

    onLoad() {
        this.currentHP = this.maxHP;

        // Lấy component Sprite để đổi màu sau này
        this.leftDoorSprite = this.leftDoor.getComponent(Sprite);
        this.rightDoorSprite = this.rightDoor.getComponent(Sprite);
        if (this.leftDoorSprite) {
            this.originalColor = this.leftDoorSprite.color.clone();
        }

        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.sensor = true;
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        }
    }

    // 🔥 THÊM MỚI: Hàm nhận sát thương
    public takeDamage(damage: number) {
        if (this.currentHP <= 0) return; // Cửa đã hỏng, không nhận thêm sát thương

        this.currentHP -= damage;
        console.log(`Cửa nhận ${damage} sát thương, máu còn lại: ${this.currentHP}`);

        // Kích hoạt hiệu ứng chớp trắng
        this.flashWhite();

        if (this.currentHP <= 0) {
            this.currentHP = 0;
            this.destroyDoor();
        }
    }

    // 🔥 THÊM MỚI: Hiệu ứng chớp trắng
    private flashWhite() {
        if (!this.leftDoorSprite || !this.rightDoorSprite) return;

        // Dừng các tween màu cũ nếu có
        tween(this.leftDoorSprite).stop();
        tween(this.rightDoorSprite).stop();

        // Đặt màu thành trắng
        this.leftDoorSprite.color = Color.WHITE;
        this.rightDoorSprite.color = Color.WHITE;

        // Dùng tween để chuyển màu về lại như cũ sau 0.1 giây
        tween(this.leftDoorSprite)
            .to(0.1, { color: this.originalColor })
            .start();

        tween(this.rightDoorSprite)
            .to(0.1, { color: this.originalColor })
            .start();
    }

    // 🔥 THÊM MỚI: Hàm phá hủy cửa
    private destroyDoor() {
        console.log("Cửa đã bị phá hủy!");
        // Thêm các hiệu ứng nổ, vỡ vụn tại đây nếu muốn
        this.node.destroy();
    }


    // --- Logic Mở/Đóng Cửa ---
    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        // Chỉ phản ứng khi Player (thuộc nhóm PLAYER) đi vào vùng TRIGGER
        if (otherCollider.group === 2) { // 2 là giá trị mặc định của nhóm PLAYER, bạn có thể thay đổi
            if (!this._isDoorOpen) {
                this.openDoor(otherCollider.node);
            }
        }
    }

    onEndContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        // Chỉ phản ứng khi Player (thuộc nhóm PLAYER) rời khỏi vùng TRIGGER
        if (otherCollider.group === 2) {
            if (this.currentHP > 0 && this._isDoorOpen) { // Chỉ đóng khi cửa chưa hỏng
                this.closeDoor();
            }
        }
    }

    openDoor(playerNode: Node) {
        if (this._isDoorOpen) return;
        this._isDoorOpen = true;
        this.stopCurrentTweens();
        const playerPosition = playerNode.worldPosition;
        const doorPosition = this.node.worldPosition;
        const isPlayerOnTheLeft = playerPosition.x < doorPosition.x;
        if (isPlayerOnTheLeft) {
            this._leftDoorTween = tween(this.leftDoor).to(this.duration, { eulerAngles: new Vec3(0, 0, this.openAngle) }, { easing: 'quadOut' }).start();
            this._rightDoorTween = tween(this.rightDoor).to(this.duration, { eulerAngles: new Vec3(0, 0, -this.openAngle) }, { easing: 'quadOut' }).start();
        } else {
            this._leftDoorTween = tween(this.leftDoor).to(this.duration, { eulerAngles: new Vec3(0, 0, -this.openAngle) }, { easing: 'quadOut' }).start();
            this._rightDoorTween = tween(this.rightDoor).to(this.duration, { eulerAngles: new Vec3(0, 0, this.openAngle) }, { easing: 'quadOut' }).start();
        }
    }

    closeDoor() {
        if (!this._isDoorOpen) return;
        this._isDoorOpen = false;
        this.stopCurrentTweens();
        this._leftDoorTween = tween(this.leftDoor).to(this.duration, { eulerAngles: new Vec3(0, 0, 0) }, { easing: 'quadIn' }).start();
        this._rightDoorTween = tween(this.rightDoor).to(this.duration, { eulerAngles: new Vec3(0, 0, 0) }, { easing: 'quadIn' }).start();
    }

    private stopCurrentTweens() {
        if (this._leftDoorTween) {
            this._leftDoorTween.stop();
            this._leftDoorTween = null;
        }
        if (this._rightDoorTween) {
            this._rightDoorTween.stop();
            this._rightDoorTween = null;
        }
    }
}