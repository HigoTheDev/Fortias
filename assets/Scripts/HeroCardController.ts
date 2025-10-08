// File: HeroCardController.ts
import { _decorator, Component, Node, Prefab, Button } from 'cc';
import { GateManager } from './GateManager';

const { ccclass, property } = _decorator;

@ccclass('HeroCardController')
export class HeroCardController extends Component {

    @property({
        type: Prefab,
        tooltip: "Prefab của Hero mà thẻ bài này đại diện."
    })
    public heroPrefab: Prefab = null!;

    private selectButton: Button = null!;

    onLoad() {
        this.selectButton = this.getComponent(Button);
        if (this.selectButton) {
            this.selectButton.node.on(Button.EventType.CLICK, this.onCardClicked, this);
        }
    }

    /**
     * Khi người chơi click vào thẻ bài này
     */
    private onCardClicked() {
        //console.log(`Player selected hero: ${this.heroPrefab.name}`);
        // Thông báo cho GateManager về lựa chọn này
        GateManager.instance.onHeroSelected(this.heroPrefab);
        }
}