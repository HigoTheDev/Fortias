import { _decorator, Component, Node, Vec3, input, Input, EventMouse, Vec2, EventTouch, CCFloat, UIOpacity, UITransform } from "cc";
import { IInput } from "./IInput";
const { ccclass, property } = _decorator;

@ccclass("VirtualJoystick")
export class VirtualJoystick extends Component implements IInput {
    @property(CCFloat) private maxDistance: number = 100;
    @property(Node) private knob: Node = null!;

    isUsingJoystic: boolean = false;
    private joystickCenter: Vec2 = new Vec2();
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

    private activateJoystick(location: Vec2): void {
        this.isUsingJoystic = true;
        this.node.active = true;
        this.getComponent(UIOpacity).opacity = 255;
        this.joystickCenter = location;

        // chuyển tọa độ màn hình -> local trong Canvas
        let parentTransform = this.node.parent.getComponent(UITransform);
        let localPos = parentTransform.convertToNodeSpaceAR(new Vec3(location.x, location.y, 0));

        this.node.setPosition(localPos);

        // knob reset về giữa joystick
        if (this.knob) {
            this.knob.setPosition(new Vec3(0, 0, 0));
        } else {
            console.warn("Knob chưa được gán trong Inspector!");
        }
    }


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
