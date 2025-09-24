import { _decorator, Component, Node, Vec3, tween, Collider2D, Contact2DType, IPhysics2DContact, Tween, Color, Sprite } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('DoorController')
export class DoorController extends Component {

    @property(Node)
    leftDoor: Node = null!;

    @property(Node)
    rightDoor: Node = null!;

    @property({
        type: Node,
        tooltip: "Node con chứa collider 'Sensor' để phát hiện Player."
    })
    doorTriggerNode: Node = null!;

    @property({ tooltip: "Góc quay khi cửa mở." })
    openAngle: number = 90;


    @property({ tooltip: "Thời gian hoàn thành animation mở/đóng cửa." })
    duration: number = 0.5;

    // --- Thuộc tính Máu ---
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

    start() {
        this.currentHP = this.maxHP;
        if (this.hpBar) {
            this.hpBar.setMaxHP(this.maxHP);
            this.hpBar.node.active = false;
        }
    }

    onLoad() {
        this.currentHP = this.maxHP;
        this.leftDoorSprite = this.leftDoor.getComponent(Sprite);
        this.rightDoorSprite = this.rightDoor.getComponent(Sprite);
        if (this.leftDoorSprite) {
            this.originalColor = this.leftDoorSprite.color.clone();
        }

        if (this.doorTriggerNode) {
            const triggerCollider = this.doorTriggerNode.getComponent(Collider2D);
            if (triggerCollider) {
                triggerCollider.sensor = true;
                triggerCollider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
                triggerCollider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
            } else {
                console.error(`Node Door_trigger không có component Collider2D!`, this.node.name);
            }
        } else {
            console.error(`Bạn chưa kéo node Door_trigger vào script DoorController!`, this.node.name);
        }
    }

    public takeDamage(damage: number) {
        if (this.currentHP <= 0) return;

        this.currentHP -= damage;

        if (this.hpBar && this.currentHP < this.maxHP) {
            this.hpBar.node.active = true;
            this.hpBar.setHP(this.currentHP);
        }

        this.flashWhite();

        if (this.currentHP <= 0) {
            this.destroyDoor();
        }
    }

    private flashWhite() {
        if (!this.leftDoorSprite || !this.rightDoorSprite) return;

        tween(this.leftDoorSprite).stop();
        tween(this.rightDoorSprite).stop();
        this.leftDoorSprite.color = Color.WHITE;
        this.rightDoorSprite.color = Color.WHITE;

        tween(this.leftDoorSprite).to(0.1, { color: this.originalColor }).start();
        tween(this.rightDoorSprite).to(0.1, { color: this.originalColor }).start();
    }

    private destroyDoor() {
        this.isDestroyed = true;
        this.node.emit(Door.EVENT_DESTROYED, this.node.worldPosition); // Phát sự kiện khi bị phá hủy
        this.node.destroy();
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        console.log(`VA CHẠM ĐÃ XẢY RA với: ${otherCollider.node.name}, Group: ${otherCollider.group}`);
        if (otherCollider.group === 16) {
            if (!this._isDoorOpen) {
                this.openDoor(otherCollider.node);
            }
        }
    }

    onEndContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (otherCollider.group === 16) {
            if (this.currentHP > 0 && this._isDoorOpen) {
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

        const targetLeftAngle = isPlayerOnTheLeft ? this.openAngle : -this.openAngle;
        const targetRightAngle = isPlayerOnTheLeft ? -this.openAngle : this.openAngle;

        this._leftDoorTween = tween(this.leftDoor).to(this.duration, { eulerAngles: new Vec3(0, 0, targetLeftAngle) }, { easing: 'quadOut' }).start();
        this._rightDoorTween = tween(this.rightDoor).to(this.duration, { eulerAngles: new Vec3(0, 0, targetRightAngle) }, { easing: 'quadOut' }).start();
    }

    closeDoor() {
        if (!this._isDoorOpen) return;
        this._isDoorOpen = false;
        this.stopCurrentTweens();
        this._leftDoorTween = tween(this.leftDoor).to(this.duration, { eulerAngles: Vec3.ZERO }, { easing: 'quadIn' }).start();
        this._rightDoorTween = tween(this.rightDoor).to(this.duration, { eulerAngles: Vec3.ZERO }, { easing: 'quadIn' }).start();
    }

    private stopCurrentTweens() {
        if (this._leftDoorTween) this._leftDoorTween.stop();
        if (this._rightDoorTween) this._rightDoorTween.stop();
    }
}