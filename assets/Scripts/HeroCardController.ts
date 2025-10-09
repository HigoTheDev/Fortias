// File: HeroCardController.ts
import { _decorator, Component, Button } from 'cc';
import { GateManager } from './GateManager';
import { CardSelectionManager } from './CardSelectionManager'; // THÊM IMPORT NÀY

const { ccclass, property } = _decorator;

@ccclass('HeroCardController')
export class HeroCardController extends Component {
    @property({ tooltip: "Tên của Prefab Hero. PHẢI TRÙNG KHỚP 100%." })
    public heroName: string = "";

    // BIẾN MỚI: Sẽ được CardSelectionManager tự động gán
    public cardPrefabName: string = "";

    private selectButton: Button = null!;

    onLoad() {
        this.selectButton = this.getComponent(Button);
        if (this.selectButton) {
            this.selectButton.node.on(Button.EventType.CLICK, this.onCardClicked, this);
        }
    }

    private onCardClicked() {
        if (!this.heroName) {
            console.error("LỖI: Thẻ bài chưa được gán Hero Name!");
            return;
        }

        // 1. Vẫn spawn hero như bình thường
        GateManager.instance.spawnHeroByName(this.heroName);

        // 2. Báo cho CardSelectionManager biết thẻ này đã được chọn
        CardSelectionManager.markCardAsUsed(this.cardPrefabName);
    }
}