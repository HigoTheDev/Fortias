import {_decorator, Component, Node, Vec3} from 'cc';
const {ccclass, property} = _decorator;

@ccclass('CameraFollow')
export class CameraFollow extends Component{
    @property(Node)
    target: Node = null!;

    @property
    smoothSpeed: number = 5;

    // @property(Node)
    // Joystick: Node = null!;

    private offset: Vec3 = new Vec3();

    start(){
        this.offset = this.node.position.clone().subtract(this.target.position);
    }

    update(deltaTime: number){
        if(!this.target) return;
        // if(!this.Joystick) return;

        let desiredPos = this.target.position.clone().add(this.offset);
        let currentPos = this.node.position;
        let smoothPos = new Vec3(
            currentPos.x + (desiredPos.x - currentPos.x) * this.smoothSpeed * deltaTime,
            currentPos.y + (desiredPos.y - currentPos.y) * this.smoothSpeed * deltaTime,
            currentPos.z
        );

        this.node.setPosition(smoothPos);
        // this.Joystick.setPosition(smoothPos);
    }
}
