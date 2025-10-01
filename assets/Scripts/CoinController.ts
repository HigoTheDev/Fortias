// File: CoinController.ts
import { _decorator, Component, Vec3, tween } from 'cc';
const { ccclass, property } = _decorator;
@ccclass('CoinController')
export class CoinController extends Component {
    /**
     * Di chuyển đồng xu đến vị trí đích một cách mượt mà.
     * @param targetWorldPos Vị trí đích (tọa độ thế giới).
     * @param onComplete Hàm callback sẽ được gọi khi di chuyển hoàn tất.
     */
    public moveTo(targetWorldPos: Vec3, onComplete?: () => void) {
        tween(this.node)
            .to(0.5, { worldPosition: targetWorldPos }, { easing: 'quadOut' })
            .call(() => {
                if (onComplete) {
                    onComplete();
                }
            })
            .start();
    }
}