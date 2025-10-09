import { _decorator, Component, Node, Prefab, instantiate } from 'cc';
import { CardSelectionManager } from './CardSelectionManager';
import { UIManager } from './UIManager';
const { ccclass, property } = _decorator;

@ccclass('HeroSelectionUI')
export class HeroSelectionUI extends Component {
    @property({type: CardSelectionManager, tooltip: "Kéo component CardSelectionManager vào đây."})
    private cardManager: CardSelectionManager = null!;

    private heroSpawnPoint: Node = null;

    public show(spawnPoint: Node) {
        if (!spawnPoint) {
            console.error("LỖI: Vị trí spawn (spawnPoint) không được cung cấp cho HeroSelectionUII!");
            return;
        }
        this.heroSpawnPoint = spawnPoint;
        this.node.active = true;
        this.cardManager.showSelection();
    }

    public onHeroCardSelected(heroPrefab: Prefab) {
        if (!heroPrefab) return;

        this.spawnHero(heroPrefab);
        UIManager.instance.hideHeroSelection();
    }
    private spawnHero(heroPrefab: Prefab) {
        if (!this.heroSpawnPoint || !this.heroSpawnPoint.isValid) {
            console.error("LỖI: Vị trí spawn không còn hợp lệ!");
            return;
        }

        const hero = instantiate(heroPrefab);
        this.heroSpawnPoint.parent.addChild(hero);
        hero.setWorldPosition(this.heroSpawnPoint.worldPosition);

        console.log(`Đã spawn Hero tại vị trí của Node: ${this.heroSpawnPoint.name}`);
    }
}