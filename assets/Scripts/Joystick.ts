import { _decorator, Component, Node, UITransform, EventTouch, Vec2, Vec3, input, Input } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Joystick')
export class Joystick extends Component {
    @property(Node)
    bg: Node = null!;

    @property(Node)
    handle: Node = null!;

    private radius: number = 0;
    private direction: Vec2 = new Vec2(0, 0);

    start() {
        this.radius = this.bg.getComponent(UITransform)!.width / 2;

        // Lắng nghe sự kiện cảm ứng
        this.bg.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        this.bg.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.bg.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        this.bg.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private onTouchStart(event: EventTouch) {
        this.onTouchMove(event);
    }

    private onTouchMove(event: EventTouch) {
        const loc = event.getUILocation();
        const pos = this.bg.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(loc.x, loc.y, 0));

        // Tính vector từ tâm -> vị trí chạm
        let dir = new Vec2(pos.x, pos.y);
        let len = dir.length();

        if (len > this.radius) {
            dir = dir.normalize().multiplyScalar(this.radius);
        }

        this.handle.setPosition(new Vec3(dir.x, dir.y, 0));
        this.direction = dir.normalize();
    }

    private onTouchEnd(event: EventTouch) {
        this.handle.setPosition(new Vec3(0, 0, 0));
        this.direction = new Vec2(0, 0);
    }

    public getDirection(): Vec2 {
        return this.direction.clone();
    }
}
