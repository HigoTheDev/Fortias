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
    private onCardClicked() {
        GateManager.instance.onHeroSelected(this.heroPrefab);
    }

}