import {_decorator, Component, sp, input, Input, EventKeyboard, KeyCode, Vec3} from 'cc';
const {ccclass, property} = _decorator;

@ccclass('PlayerSpine')
export class PlayerSpine extends Component{
    @property(sp.Skeleton)
    spine: sp.Skeleton = null!;

    @property
    speed: number = 200;

    private moving: boolean = false;
    private moveDir: Vec3 = new Vec3(0,0,0);

    start(){
        this.spine.setAnimation(0, "idle", true);
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.originalScale = this.node.getScale();
    }

    update(deltaTime: number) {
        if (!this.moveDir.equals(Vec3.ZERO)) {
            const pos = this.node.position;
            const newPos = new Vec3(
                pos.x + this.moveDir.x * this.speed * deltaTime,
                pos.y + this.moveDir.y * this.speed * deltaTime,
                pos.z
            );
            this.node.setPosition(newPos);

            if (this.spine.animation !== "run") {
                this.spine.setAnimation(0, "run", true);
            }
        } else {
            if (this.spine.animation !== "idle") {
                this.spine.setAnimation(0, "idle", true);
            }
        }
    }

    private onKeyDown(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_W:
                this.moveDir.y = 1;
                break;
            case KeyCode.KEY_S:
                this.moveDir.y = -1;
                break;
            case KeyCode.KEY_A:
                this.moveDir.x = -1;
                this.node.setScale(new Vec3(-this.originalScale.x, this.originalScale.y, this.originalScale.z));
                break;
            case KeyCode.KEY_D:
                this.moveDir.x = 1;
                this.node.setScale(new Vec3(this.originalScale.x, this.originalScale.y, this.originalScale.z));
                break;
        }
    }

    private onKeyUp(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.KEY_S:
                this.moveDir.y = 0;
                break;
            case KeyCode.KEY_A:
            case KeyCode.KEY_D:
                this.moveDir.x = 0;
                break;
        }
    }
}
