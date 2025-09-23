import { _decorator, Component, Prefab, Node, instantiate, math } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CurrencySpawner')
export class CurrencySpawner extends Component {
    @property(Prefab)
    goldPrefab: Prefab = null!;

    @property(Prefab)
    diamondPrefab: Prefab = null!;

    @property(Node)
    parentNode: Node = null!;

    start() {
        this.schedule(this.spawnCurrency, 2);
    }

    private spawnCurrency() {
        const rand = Math.random();
        let prefab = rand > 0.5 ? this.goldPrefab : this.diamondPrefab;

        const newItem = instantiate(prefab);
        newItem.setPosition(math.randomRange(-300, 300), math.randomRange(-200, 200), 0);
        this.parentNode.addChild(newItem);
    }
}
