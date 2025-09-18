import { _decorator, Component, Node, Vec3, tween, Collider2D, Contact2DType, IPhysics2DContact, RigidBody2D, Tween } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('DoorController')
export class DoorController extends Component {
    @property(Node)
    leftDoor: Node = null!;

    @property(Node)
    rightDoor: Node = null!;

    @property
    openDistance: number = 50;

    @property
    duration: number = 0.5;

    @property
    autoCloseDelay: number = 1.0;

    private _playerInside: boolean = false;
    private _playerNode: Node = null!;
    private _autoCloseTimer: any = null;
    private _isDoorOpen: boolean = false;
    private _leftDoorTween: Tween<Node> | null = null;
    private _rightDoorTween: Tween<Node> | null = null;

    onLoad() {
        const collider = this.getComponent(Collider2D);
        if(collider){
            collider.sensor = true;
        }
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        }
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (otherCollider.node.name === "Fighter") {
            this._playerNode = otherCollider.node;
            this._playerInside = true;

            // Hủy timer auto-close
            if (this._autoCloseTimer) {
                clearTimeout(this._autoCloseTimer);
                this._autoCloseTimer = null;
            }
            
            // Chỉ mở cửa nếu cửa đang đóng
            if (!this._isDoorOpen) {
                this.openDoor();
            }
        }
    }

    onEndContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (otherCollider.node.name === "Fighter") {
            this._playerInside = false;

            // Đặt timer để đóng cửa
            this._autoCloseTimer = setTimeout(() => {
                if (!this._playerInside && this._isDoorOpen) {
                    this.closeDoor();
                }
            }, this.autoCloseDelay * 1000);
        }
    }

    openDoor() {
        // Ngăn mở cửa nếu đã mở rồi
        if (this._isDoorOpen) {
            return;
        }

        console.log("Opening door...");

        // Dừng tween hiện tại nếu có
        this.stopCurrentTweens();
        
        this._isDoorOpen = true;

        // Tính toán hướng mở cửa - sử dụng trục X vì cửa đặt dọc
        const playerPosition = this._playerNode.worldPosition;
        const doorPosition = this.node.worldPosition;
        const direction = playerPosition.subtract(doorPosition);
        
        // Player ở bên trái cửa (X < 0) = inward = true
        // Player ở bên phải cửa (X > 0) = inward = false  
        const isInward = direction.x < 0;
        
        console.log(`Player X: ${playerPosition.x}, Door X: ${doorPosition.x}, Direction X: ${direction.x}, Open inward: ${isInward}`);

        if (isInward) {
            // Mở vào trong - player ở bên trái
            this._leftDoorTween = tween(this.leftDoor)
                .to(this.duration, { eulerAngles: new Vec3(0, 0, 90) })
                .start();

            this._rightDoorTween = tween(this.rightDoor)
                .to(this.duration, { eulerAngles: new Vec3(0, 0, -90) })
                .start();
        } else {
            // Mở ra ngoài - player ở bên phải
            this._leftDoorTween = tween(this.leftDoor)
                .to(this.duration, { eulerAngles: new Vec3(0, 0, -90) })
                .start();

            this._rightDoorTween = tween(this.rightDoor)
                .to(this.duration, { eulerAngles: new Vec3(0, 0, 90) })
                .start();
        }
    }

    closeDoor() {
        // Ngăn đóng cửa nếu đã đóng rồi
        if (!this._isDoorOpen) {
            return;
        }

        console.log("Closing door...");

        // Dừng tween hiện tại nếu có
        this.stopCurrentTweens();

        this._isDoorOpen = false;

        // Đóng cửa về vị trí ban đầu (0 độ)
        this._leftDoorTween = tween(this.leftDoor)
            .to(this.duration, { eulerAngles: new Vec3(0, 0, 0) })
            .start();

        this._rightDoorTween = tween(this.rightDoor)
            .to(this.duration, { eulerAngles: new Vec3(0, 0, 0) })
            .start();
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

    onDestroy() {
        if (this._autoCloseTimer) {
            clearTimeout(this._autoCloseTimer);
            this._autoCloseTimer = null;
        }
        
        this.stopCurrentTweens();
    }
}