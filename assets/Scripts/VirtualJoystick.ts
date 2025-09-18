import { _decorator, Component, Node, Vec3, input, Input, EventMouse, Vec2, EventTouch, CCFloat, UIOpacity, UITransform } from "cc";
import { IInput } from "./IInput";
const { ccclass, property } = _decorator;

@ccclass("VirtualJoystick")
export class VirtualJoystick extends Component implements IInput {
    @property(CCFloat) private maxDistance: number = 100;   // bán kính joystick
    @property(Node) private knob: Node = null!;             // núm điều khiển

    isUsingJoystic: boolean = false;
    private joystickCenter: Vec2 = new Vec2();   // tâm joystick trong screen-space
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

    /** Trả về vector hướng [-1..1] */
    public getAxis(): Vec2 {
        if (this.isUsingJoystic) {
            return new Vec2(
                this.knob.position.x / this.maxDistance,
                this.knob.position.y / this.maxDistance
            );
        }
        return new Vec2();
    }

    private activateTouchJoystick(e: EventTouch): void {
        const location = e.getUILocation();
        this.activateJoystick(location);
    }

    /** Spawn joystick tại vị trí chạm */
    private activateJoystick(location: Vec2): void {
        this.isUsingJoystic = true;
        this.node.active = true;
        this.getComponent(UIOpacity).opacity = 255;

        // Lưu lại vị trí joystick center trong screen-space
        this.joystickCenter = location.clone();

        // Đặt joystick node về local (Canvas)
        const parentTransform = this.node.parent!.getComponent(UITransform)!;
        const localPos = parentTransform.convertToNodeSpaceAR(new Vec3(location.x, location.y, 0));
        this.node.setPosition(localPos);

        // Reset knob về tâm
        this.knob.setPosition(new Vec3(0, 0, 0));
    }

    /** Ẩn joystick khi thả tay */
    public deactivateJoystick(): void {
        this.isUsingJoystic = false;
        this.getComponent(UIOpacity).opacity = 0;
        this.node.active = false;
        this.knob.setPosition(new Vec3(0, 0, 0));
    }

    private moveKnobTouch(e: EventTouch): void {
        this.moveKnob(e.getUILocation());
    }

    private moveKnobMouse(e: EventMouse): void {
        this.moveKnob(e.getUILocation());
    }

    /** Xử lý di chuyển knob */
    private moveKnob(location: Vec2): void {
        if (!this.isUsingJoystic) return;

        // delta so với tâm joystick (screen space)
        const posDelta = location.subtract(this.joystickCenter);
        let x = posDelta.x;
        let y = posDelta.y;

        // Giới hạn bán kính
        const length = Math.sqrt(x * x + y * y);
        if (length > this.maxDistance) {
            const multiplier = this.maxDistance / length;
            x *= multiplier;
            y *= multiplier;
        }

        // knob đặt theo local (joystick node), nên OK
        this.knob.setPosition(new Vec3(x, y, 0));
    }
}
