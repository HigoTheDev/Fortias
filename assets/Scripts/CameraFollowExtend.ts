import { _decorator, Component, Node, Vec3, Camera } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraFollow')
export class CameraFollow extends Component {
    @property(Node)
    target: Node = null!;

    @property(Camera)
    cam: Camera = null!;

    @property
    zoomStep: number = 10;

    private offset: Vec3 = new Vec3();

    start() {
        if (this.target) {
            this.offset = this.node.position.clone().subtract(this.target.position);
        }
    }

    update() {
        if (!this.target) return;

        let desiredPos = this.target.position.clone().add(this.offset);
        this.node.setPosition(desiredPos);
    }

    public zoomIn() {
        if (this.cam) {
            this.cam.orthoHeight = Math.max(1, this.cam.orthoHeight - this.zoomStep); // zoom cận
        }
    }

    public zoomOut() {
        if (this.cam) {
            this.cam.orthoHeight += this.zoomStep; // zoom xa
        }
    }
}
