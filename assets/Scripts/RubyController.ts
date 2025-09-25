import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('RubyController')
export class RubyController extends Component {
    // 🔥 THÊM: Một biến để kiểm tra xem Ruby đã được thu thập chưa
    public isCollected: boolean = false;
}