// File: GateManager.ts
import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, v3, CCInteger } from 'cc';
import { CoinGateController } from './CoinGateController';
import { UIManager } from './UIManager';

const { ccclass, property } = _decorator;

@ccclass('GateManager')
export class GateManager extends Component {

    public static instance: GateManager = null!;

    @property({ type: Prefab, tooltip: "Prefab của CoinGate để spawn." })
    public gatePrefab: Prefab = null!;

    @property({ type: [Node], tooltip: "Danh sách các Node vị trí để spawn cổng và trụ THEO THỨ TỰ." })
    public spawnPoints: Node[] = [];

    @property({ type: [Prefab], tooltip: "Danh sách các Prefab Trụ, THEO THỨ TỰ tương ứng với Spawn Points." })
    public towerPrefabs: Prefab[] = [];

    @property({ type: [CCInteger], tooltip: "Danh sách chi phí (số Coin) cho mỗi cổng, THEO THỨ TỰ." })
    public gateCosts: number[] = [3, 50, 60];

    private currentSpawnIndex: number = -1;
    private lastSpawnedTower: Node = null;

    // THÊM VÀO: Biến đếm số trụ đã xây
    private towersBuiltCount: number = 0;

    onLoad() {
        if (GateManager.instance === null) {
            GateManager.instance = this;
        } else {
            this.destroy();
        }
    }

    start() {
        if (!this.gatePrefab || this.spawnPoints.length === 0) {
            console.error("Chưa gán Gate Prefab hoặc Spawn Points cho GateManager!");
            return;
        }
        this.spawnNextGate();
    }

    public onGateUnlocked(unlockedPoint: Node) {
        this.spawnTowerAtPoint(unlockedPoint);
        UIManager.instance.showHeroSelectionUI();
    }

    public onHeroSelected(heroPrefab: Prefab) {
        UIManager.instance.hideHeroSelectionUI();
        this.placeHeroOnTower(heroPrefab);
        this.towersBuiltCount++;
        console.log(`LOG: Đã chọn thẻ. Số trụ xây xong: ${this.towersBuiltCount}`);

        if (this.towersBuiltCount >= 3) {
            console.log("LOG: Đạt đủ 3 trụ. Đang gọi hàm showNextLevelScreen...");
            UIManager.instance.showNextLevelScreen();
        } else {
            this.scheduleOnce(() => { this.spawnNextGate(); }, 1.0);
        }
    }

    private placeHeroOnTower(heroPrefab: Prefab) {
        if (this.lastSpawnedTower && heroPrefab) {
            const mountPoint = this.lastSpawnedTower.getChildByName("heroMountPoint");
            if (mountPoint) {
                mountPoint.removeAllChildren();
                const heroNode = instantiate(heroPrefab);
                mountPoint.addChild(heroNode);
            } else {
                console.error(`Không tìm thấy node con tên "heroMountPoint" trên trụ ${this.lastSpawnedTower.name}!`);
            }
        }
    }

    private spawnNextGate() {
        this.currentSpawnIndex++;
        if (this.currentSpawnIndex >= this.spawnPoints.length) {
            console.log("🎉 Đã xây tất cả các trụ! Màn chơi hoàn thành!");
            return;
        }
        const spawnPoint = this.spawnPoints[this.currentSpawnIndex];
        const cost = this.gateCosts[this.currentSpawnIndex];
        this.spawnGateAtPoint(spawnPoint, cost);
    }

    private spawnGateAtPoint(point: Node, cost: number) {
        const gate = instantiate(this.gatePrefab);
        this.node.addChild(gate);
        gate.setWorldPosition(point.worldPosition);
        const gateController = gate.getComponent(CoinGateController);
        if (gateController) {
            gateController.initialize(point, cost);
        }
    }

    private spawnTowerAtPoint(point: Node) {
        const pointIndex = this.spawnPoints.indexOf(point);
        const towerPrefabToSpawn = this.towerPrefabs[pointIndex];
        const tower = instantiate(towerPrefabToSpawn);
        this.node.addChild(tower);
        tower.setWorldPosition(point.worldPosition);
        tower.scale = v3(0, 0, 0);
        tween(tower).to(0.5, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
        this.lastSpawnedTower = tower;
    }
}