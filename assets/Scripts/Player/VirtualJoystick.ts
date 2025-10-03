import { _decorator, Component, Node, Vec3, input, Input, EventMouse, Vec2, EventTouch, CCFloat, UIOpacity, UITransform, v3 } from "cc";
import { IInput } from "./IInput";
const { ccclass, property } = _decorator;

@ccclass("VirtualJoystick")
export class VirtualJoystick extends Component implements IInput {
    // --- Thuộc tính gốc ---
    @property(CCFloat) private maxDistance: number = 100;
    @property(Node) private knob: Node = null!;

    // --- Thuộc tính mới cho Tutorial ---
    @property({ type: Node, tooltip: "Node chứa hình ảnh bàn tay hướng dẫn" })
    private handSprite: Node = null!;

    @property({ type: CCFloat, tooltip: "Thời gian (giây) chờ trước khi hiện lại tutorial" })
    private idleTimeout: number = 5.0;

    @property({
        type: Vec3,
        tooltip: "Vị trí của NỀN JOYSTICK khi ở chế độ tutorial (tọa độ local trong Canvas)"
    })
    private tutorialPosition: Vec3 = new Vec3(0, -250, 0);

    @property({
        type: Vec3,
        tooltip: "Vị trí trung tâm của BÀN TAY HƯỚNG DẪN (tọa độ local trong Canvas)"
    })
    private tutorialHandPosition: Vec3 = new Vec3(0, 0, 0);

    // --- Biến trạng thái ---
    public isUsingJoystic: boolean = false;
    private joystickCenter: Vec2 = new Vec2();
    public static instance: VirtualJoystick = null;

    private isTutorialActive: boolean = false;
    private idleTimer: number = 0;
    private tutorialAngle: number = 0;
    private tutorialSpeed: number = 2.5;

    private uiOpacity: UIOpacity = null;
    private uiTransform: UITransform = null;

    // SỬA LỖI: Thêm biến cờ để kiểm soát việc tính toán
    private isTutorialOffsetCalculated: boolean = false;
    private tutorialHandOffset: Vec3 = v3();

    onLoad() {
        VirtualJoystick.instance = this;
        this.uiOpacity = this.getComponent(UIOpacity) || this.addComponent(UIOpacity);
        this.uiTransform = this.getComponent(UITransform) || this.addComponent(UITransform);
        this.init();
    }

    start() {
        this.startTutorial();
    }

    update(deltaTime: number) {
        if (this.isTutorialActive) {
            // SỬA LỖI: Tính toán offset một lần duy nhất khi bắt đầu
            if (!this.isTutorialOffsetCalculated) {
                this.tutorialHandOffset = this.uiTransform.convertToNodeSpaceAR(this.tutorialHandPosition);
                this.isTutorialOffsetCalculated = true;
            }

            this.tutorialAngle += deltaTime * this.tutorialSpeed;
            const radius = this.maxDistance * 0.8;
            const x = Math.cos(this.tutorialAngle) * radius;
            const y = Math.sin(this.tutorialAngle) * radius;
            const animOffset = v3(x, y, 0);

            this.knob.setPosition(animOffset);

            if (this.handSprite) {
                const finalHandPos = this.tutorialHandOffset.clone().add(animOffset);
                this.handSprite.setPosition(finalHandPos);
            }
        }

        if (this.idleTimer > 0) {
            this.idleTimer -= deltaTime;
            if (this.idleTimer <= 0) {
                this.startTutorial();
            }
        }
    }

    private init(): void {
        input.on(Input.EventType.TOUCH_START, this.activateTouchJoystick, this);
        input.on(Input.EventType.TOUCH_END, this.deactivateJoystick, this);
        input.on(Input.EventType.TOUCH_MOVE, this.moveKnobTouch, this);
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
        if (this.isTutorialActive) {
            this.stopTutorial();
        }
        this.idleTimer = 0;
        const location = e.getUILocation();
        this.activateJoystick(location);
    }

    private activateJoystick(location: Vec2): void {
        this.isUsingJoystic = true;
        this.uiOpacity.opacity = 255;
        this.joystickCenter = location;
        let parentTransform = this.node.parent.getComponent(UITransform);
        let localPos = parentTransform.convertToNodeSpaceAR(new Vec3(location.x, location.y, 0));
        this.node.setPosition(localPos);
        if (this.knob) this.knob.setPosition(new Vec3(0, 0, 0));
    }

    public deactivateJoystick(): void {
        if (!this.isUsingJoystic) return;
        this.isUsingJoystic = false;
        this.uiOpacity.opacity = 0;
        this.knob.setPosition(new Vec3(0, 0, 0));
        this.idleTimer = this.idleTimeout;
    }

    private moveKnobTouch(e: EventTouch): void { this.moveKnob(e.getUILocation()); }

    private moveKnob(location: Vec2): void {
        if (!this.isUsingJoystic) return;
        const posDelta = location.subtract(this.joystickCenter);
        let x = posDelta.x, y = posDelta.y;
        const length = Math.sqrt(x * x + y * y);
        if (length > this.maxDistance) {
            const multiplier = this.maxDistance / length;
            x *= multiplier;
            y *= multiplier;
        }
        this.knob.setPosition(new Vec3(x, y, 0));
    }

    private startTutorial(): void {
        this.isTutorialActive = true;
        this.isUsingJoystic = false;
        this.idleTimer = 0;
        this.uiOpacity.opacity = 255;
        this.node.setPosition(this.tutorialPosition);

        // SỬA LỖI: Reset cờ để tính toán lại khi tutorial bắt đầu
        this.isTutorialOffsetCalculated = false;

        if (this.handSprite) this.handSprite.active = true;
    }

    private stopTutorial(): void {
        this.isTutorialActive = false;
        if (this.handSprite) this.handSprite.active = false;
        this.knob.setPosition(v3(0, 0, 0));
    }
}