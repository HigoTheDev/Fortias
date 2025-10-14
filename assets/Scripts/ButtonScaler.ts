import { _decorator, Component, Node, tween, v3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ButtonScaler')
export class ButtonScaler extends Component {

    start() {
        this.startScalingEffect();
    }

    startScalingEffect() {
        const scaleUpAction = tween().to(0.8, { scale: v3(0.75, 0.75, 0.75) });   // Phóng to lên 1.1 lần trong 0.5 giây
        const scaleDownAction = tween().to(0.8, { scale: v3(0.55, 0.55, 0.55) });       // Thu nhỏ về kích thước gốc trong 0.5 giây

        // Tạo một chuỗi hành động: phóng to -> thu nhỏ
        const sequence = tween().sequence(scaleUpAction, scaleDownAction);

        // Tween mục tiêu là node hiện tại (nút bấm)
        tween(this.node)
            .then(sequence)       // Thực hiện chuỗi hành động
            .repeatForever()      // Lặp lại mãi mãi
            .start();             // Bắt đầu
    }
}