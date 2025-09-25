import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('DropZoneController')
export class DropZoneController extends Component {
    /**
     * Node mục tiêu mà các viên Ruby sẽ bay về.
     * Hãy kéo Node Table của bạn vào đây trong Inspector.
     */
    @property({
        type: Node,
        tooltip: "Cái bàn hoặc vị trí mà Ruby sẽ được đặt lên."
    })
    public targetNode: Node = null!;
}