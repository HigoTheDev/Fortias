import { _decorator, Component, Animation } from 'cc';
const { ccclass } = _decorator;

@ccclass('EffectController')
export class EffectController extends Component {

    private anim: Animation | null = null;

    onLoad() {
        this.anim = this.getComponent(Animation);

        // Lắng nghe sự kiện 'FINISHED' - sự kiện này sẽ phát ra khi một clip animation kết thúc.
        if (this.anim) {
            this.anim.on(Animation.EventType.FINISHED, this.onAnimationFinished, this);
        }
    }

    // Hàm này sẽ được gọi tự động khi animation kết thúc
    onAnimationFinished() {
        this.node.destroy(); // Tự hủy node
    }

    onDestroy() {
        // Luôn hủy đăng ký lắng nghe sự kiện khi đối tượng bị hủy để tránh rò rỉ bộ nhớ
        if (this.anim) {
            this.anim.off(Animation.EventType.FINISHED, this.onAnimationFinished, this);
        }
    }
}