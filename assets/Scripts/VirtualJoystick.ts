import { _decorator, Component, Node, Vec3, input, Input, EventMouse, Vec2, EventTouch, CCFloat, UIOpacity, UITransform } from "cc";
import { IInput } from "./IInput";
const { ccclass, property } = _decorator;

@ccclass("VirtualJoystick")
export class VirtualJoystick extends Component implements IInput {
    @property(CCFloat) private maxDistance: number = 100;
    @property(Node) private knob: Node = null!;

    isUsingJoystick: boolean = false;
    private defaultPosition: Vec2 = new Vec2();
    public static instance: VirtualJoystick = null;

    onLoad() {
        VirtualJoystick.instance = this;
        this.getComponent(UIOpacity).opacity = 0;
        this.init();
    }

    private init(): void {
        input.on(Input.EventType.TOUCH_START, this.activateTouchJoystick, this);
        input.on(Input.EventType.TOUCH_END, this.deactivateJoystick, this);
        input.on(Input.EventType.TOUCH_MOVE, this.moveKnobTouch, this);

        this.deactivateJoystick();
    }

    // Trả về hướng normalized (-1 -> 1)
    public getAxis(): Vec2 {
        if (this.isUsingJoystick) {
            const pos = this.knob.getPosition();
            return new Vec2(pos.x / this.maxDistance, pos.y / this.maxDistance);
        }
        return new Vec2();
    }

    private activateTouchJoystick(e: EventTouch): void {
        const location = e.getUILocation();
        const canvasTransform = this.node.parent!.getComponent(UITransform)!;

        // chuyển vị trí click sang local của canvas
        const localPos = canvasTransform.convertToNodeSpaceAR(new Vec3(location.x, location.y, 0));

        this.isUsingJoystick = true;
        this.node.active = true;

        // đặt joystick theo vị trí bấm
        this.node.setPosition(localPos);
        this.defaultPosition = new Vec2(localPos.x, localPos.y);

        // reset knob về tâm
        this.knob.setPosition(new Vec3(0, 0, 0));
    }

    public deactivateJoystick(): void {
        this.isUsingJoystick = false;
        this.node.active = false;  // ẩn joystick
        this.knob.setPosition(new Vec3(0, 0, 0));
    }

    private moveKnobTouch(e: EventTouch): void {
        const location = e.getUILocation();
        const canvasTransform = this.node.parent!.getComponent(UITransform)!;
        const localLoc = canvasTransform.convertToNodeSpaceAR(new Vec3(location.x, location.y, 0));

        this.moveKnob(localLoc);
    }

    private moveKnob(location: Vec3): void {
        if (!this.isUsingJoystick) return;

        // vị trí hiện tại - tâm
        const posDelta: Vec2 = new Vec2(location.x - this.defaultPosition.x, location.y - this.defaultPosition.y);

        let x: number = posDelta.x;
        let y: number = posDelta.y;

        // giới hạn trong vòng tròn maxDistance
        const length: number = Math.sqrt(x * x + y * y);
        if (length > this.maxDistance) {
            const multiplier: number = this.maxDistance / length;
            x *= multiplier;
            y *= multiplier;
        }

        this.knob.setPosition(new Vec3(x, y, 0));
    }
}
