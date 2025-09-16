import { _decorator, Component, Node, Vec3, input, Input, EventKeyboard, KeyCode, sp } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {

    @property({
        type: Number,
        tooltip: 'Tốc độ di chuyển của nhân vật'
    })
    public speed: number = 100;

    @property(sp.Skeleton)
    spine: sp.Skeleton = null!;

    private _currentSpeed: Vec3 = new Vec3(0, 0, 0);
    private originalScale: Vec3 = new Vec3(1, 1, 1);

    start() {
        // Nếu quên gán spine trong Inspector thì lấy tự động từ node con
        if (!this.spine) {
            this.spine = this.getComponentInChildren(sp.Skeleton)!;
        }

        this.spine.setAnimation(0, "idle", true);

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);

        this.originalScale = this.node.getScale();
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    onKeyDown(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                this._currentSpeed.y = this.speed;
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this._currentSpeed.y = -this.speed;
                break;
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this._currentSpeed.x = -this.speed;
                this.node.setScale(new Vec3(-this.originalScale.x, this.originalScale.y, this.originalScale.z)); // Quay trái
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this._currentSpeed.x = this.speed;
                this.node.setScale(new Vec3(this.originalScale.x, this.originalScale.y, this.originalScale.z));  // Quay phải
                break;
        }
    }

    onKeyUp(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this._currentSpeed.y = 0;
                break;
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this._currentSpeed.x = 0;
                break;
        }
    }

    update(deltaTime: number) {
        // Di chuyển
        let pos = this.node.position.clone();
        pos.add(new Vec3(
            this._currentSpeed.x * deltaTime,
            this._currentSpeed.y * deltaTime,
            0
        ));
        this.node.setPosition(pos);

        // Đổi animation
        if (this._currentSpeed.x !== 0 || this._currentSpeed.y !== 0) {
            // Nếu đi lên -> dùng run_90
            if (this._currentSpeed.y > 0) {
                if (this.spine.getCurrent(0)?.animation?.name !== "run_90") {
                    this.spine.setAnimation(0, "run_90", true);
                }
            }
            // Các hướng khác -> dùng run
            else {
                if (this.spine.getCurrent(0)?.animation?.name !== "run") {
                    this.spine.setAnimation(0, "run", true);
                }
            }
        } else {
            if (this.spine.getCurrent(0)?.animation?.name !== "idle") {
                this.spine.setAnimation(0, "idle", true);
            }
        }
    }
}
