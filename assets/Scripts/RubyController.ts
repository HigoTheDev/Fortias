import { _decorator, Component, Node } from 'cc';
import { RubyManager} from "db://assets/Scripts/Currency/RubyManager";

const { ccclass, property } = _decorator;

@ccclass('RubyController')
export class RubyController extends Component {
    // Biến để kiểm tra xem Ruby đã được thu thập (bắt đầu bay) chưa
    public isCollected: boolean = false;

    public isAttractable: boolean = false;

    @property({ tooltip: "Thời gian trễ (giây) trước khi Player có thể hút Ruby." })
    public collectionDelay: number = 0.5;

    start() {
        this.scheduleOnce(() => {
            this.isAttractable = true;
        }, this.collectionDelay);
    }

    onDestroy() {
        // Luôn kiểm tra để đảm bảo instance của Manager tồn tại trước khi gọi
        if (RubyManager && RubyManager.instance) {
            RubyManager.instance.removeRuby(this.node);
        }
    }
}