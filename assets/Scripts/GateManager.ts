// File: GateManager.ts
import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, v3, CCInteger } from 'cc';
import { CoinGateController } from './CoinGateController';

const { ccclass, property } = _decorator;

@ccclass('GateManager')
export class GateManager extends Component {

    public static instance: GateManager = null!;

    @property({ type: Prefab, tooltip: "Prefab của CoinGate để spawn." })
    public gatePrefab: Prefab = null!;

    @property({
        type: [Node],
        tooltip: "Danh sách các Node vị trí để spawn cổng và trụ THEO THỨ TỰ."
    })
    public spawnPoints: Node[] = [];

    @property({
        type: [Prefab],
        tooltip: "Danh sách các Prefab Trụ, THEO THỨ TỰ tương ứng với Spawn Points."
    })
    public towerPrefabs: Prefab[] = [];

    @property({
        type: [CCInteger],
        tooltip: "Danh sách chi phí (số Coin) cho mỗi cổng, THEO THỨ TỰ tương ứng với Spawn Points."
    })
    public gateCosts: number[] = [30, 50, 60];

    private currentSpawnIndex: number = -1;

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

        if (this.spawnPoints.length !== this.towerPrefabs.length || this.spawnPoints.length !== this.gateCosts.length) {
            console.warn("Số lượng Spawn Points, Tower Prefabs, và Gate Costs không bằng nhau! Điều này có thể gây lỗi.");
        }

        this.spawnNextGate();
    }

    public onGateUnlocked(unlockedPoint: Node) {
        this.spawnTowerAtPoint(unlockedPoint);

        this.scheduleOnce(() => {
            this.spawnNextGate();
        }, 1.5);
    }

    private spawnNextGate() {
        this.currentSpawnIndex++;

        if (this.currentSpawnIndex >= this.spawnPoints.length) {
            console.log("🎉 Đã mở khóa tất cả các cổng!");
            return;
        }

        const spawnPoint = this.spawnPoints[this.currentSpawnIndex];
        const cost = this.gateCosts[this.currentSpawnIndex];

        if (cost === undefined) {
            console.error(`Không tìm thấy chi phí cho cổng tại vị trí thứ ${this.currentSpawnIndex + 1}!`);
            return;
        }

        this.spawnGateAtPoint(spawnPoint, cost);
    }

    private spawnGateAtPoint(point: Node, cost: number) {
        if (!this.gatePrefab) return;
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

        if (pointIndex === -1) {
            console.error("Lỗi: Không tìm thấy điểm spawn trong danh sách.", point);
            return;
        }

        if (pointIndex >= this.towerPrefabs.length || !this.towerPrefabs[pointIndex]) {
            console.error(`Chưa gán Tower Prefab cho vị trí thứ ${pointIndex + 1}!`);
            return;
        }

        const towerPrefabToSpawn = this.towerPrefabs[pointIndex];
        const tower = instantiate(towerPrefabToSpawn);
        this.node.addChild(tower);
        tower.setWorldPosition(point.worldPosition);

        // Hiệu ứng spawn cho trụ
        tower.scale = v3(0, 0, 0);
        tween(tower)
            .to(0.5, { scale: v3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }
}