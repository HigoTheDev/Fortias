import { _decorator, Component, Node, UITransform, EventTouch, Vec2, Vec3, Input } from 'cc';
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
        this.node.parent!.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.parent!.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.parent!.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.parent!.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private onTouchStart(event: EventTouch) {
        const loc = event.getUILocation();
        this.node.setWorldPosition(new Vec3(loc.x, loc.y, 0));
        this.node.active = true;
        this.handle.setPosition(new Vec3(0,0,0));
        this.direction = new Vec2(0,0);
    }

    private onTouchMove(event: EventTouch) {
        if (!this.node.active) return;

        const loc = event.getUILocation();
        const uiTransform = this.bg.getComponent(UITransform)!;
        const pos = uiTransform.convertToNodeSpaceAR(new Vec3(loc.x, loc.y, 0));

        let dir = new Vec2(pos.x, pos.y);
        let len = dir.length();

        if (len > this.radius) {
            dir = dir.normalize().multiplyScalar(this.radius);
        }

        this.handle.setPosition(new Vec3(dir.x, dir.y, 0));
        this.direction = len > 0 ? dir.normalize() : new Vec2(0,0);
    }

    private onTouchEnd(event: EventTouch) {
        this.node.active = false;
        this.direction = new Vec2(0,0);
    }

    public getDirection(): Vec2 {
        return this.direction.clone();
    }
}
