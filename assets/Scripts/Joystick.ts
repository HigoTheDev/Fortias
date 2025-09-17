import { _decorator, Component, Node, UITransform, EventTouch, Vec2, Vec3, Input, input } from 'cc';
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

        this.node.active = false;

        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private onTouchStart(event: EventTouch) {
        const loc = event.getUILocation();

        const canvas = this.node.parent!.getComponent(UITransform)!;
        const localPos = canvas.convertToNodeSpaceAR(new Vec3(loc.x, loc.y, 0));

        this.node.active = true;
        this.node.setPosition(localPos);

        this.handle.setPosition(new Vec3(0, 0, 0));
        this.direction.set(0, 0);
    }

    private onTouchMove(event: EventTouch) {
        if (!this.node.active) return;

        const loc = event.getUILocation();
        const bgWorld = this.bg.getWorldPosition();

        const delta = new Vec2(loc.x - bgWorld.x, loc.y - bgWorld.y);

        let dir = delta.clone();
        let len = dir.length();

        if (len > this.radius) {
            dir = dir.normalize().multiplyScalar(this.radius);
        }

        this.handle.setPosition(new Vec3(dir.x, dir.y, 0));
        this.direction = len > 0 ? delta.normalize() : new Vec2(0, 0);
    }

    private onTouchEnd(event: EventTouch) {
        this.node.active = false;
        this.direction.set(0, 0);
        this.handle.setPosition(new Vec3(0, 0, 0));
    }

    public getDirection(): Vec2 {
        return this.direction.clone();
    }
}
