// File: GateManager.ts (Cập nhật để spawn nhiều loại trụ khác nhau)
import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, v3 } from 'cc';
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

    // ✅ THAY ĐỔI: Chuyển thành một danh sách các Prefab Trụ
    @property({
        type: [Prefab],
        tooltip: "Danh sách các Prefab Trụ, THEO THỨ TỰ tương ứng với Spawn Points."
    })
    public towerPrefabs: Prefab[] = [];

    // --- Private Variables ---
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

        // ✅ THÊM: Kiểm tra để đảm bảo số lượng trụ và vị trí khớp nhau
        if (this.spawnPoints.length !== this.towerPrefabs.length) {
            console.warn("Số lượng Spawn Points và Tower Prefabs không bằng nhau! Điều này có thể gây lỗi.");
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
        if (this.spawnPoints.length === 0) return;

        this.currentSpawnIndex++;
        if (this.currentSpawnIndex >= this.spawnPoints.length) {
            this.currentSpawnIndex = 0;
        }

        const spawnPoint = this.spawnPoints[this.currentSpawnIndex];
        this.spawnGateAtPoint(spawnPoint);
    }

    private spawnGateAtPoint(point: Node) {
        if (!this.gatePrefab) return;
        const gate = instantiate(this.gatePrefab);
        this.node.addChild(gate);
        gate.setWorldPosition(point.worldPosition);

        const gateController = gate.getComponent(CoinGateController);
        if (gateController) {
            gateController.setSpawnPoint(point);
        }
    }

    // ✅ THAY ĐỔI: Logic spawn trụ để chọn đúng prefab
    private spawnTowerAtPoint(point: Node) {
        // Tìm vị trí của điểm spawn trong danh sách để lấy đúng index
        const pointIndex = this.spawnPoints.indexOf(point);

        if (pointIndex === -1) {
            console.error("Lỗi: Không tìm thấy điểm spawn trong danh sách.", point);
            return;
        }

        // Kiểm tra xem có prefab trụ tương ứng với vị trí này không
        if (pointIndex >= this.towerPrefabs.length || !this.towerPrefabs[pointIndex]) {
            console.error(`Chưa gán Tower Prefab cho vị trí thứ ${pointIndex + 1}!`);
            return;
        }

        // Lấy đúng prefab trụ dựa trên index
        const towerPrefabToSpawn = this.towerPrefabs[pointIndex];

        const tower = instantiate(towerPrefabToSpawn);
        this.node.addChild(tower);
        tower.setWorldPosition(point.worldPosition);

        tower.scale = v3(0, 0, 0);
        tween(tower)
            .to(0.5, { scale: v3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }
}