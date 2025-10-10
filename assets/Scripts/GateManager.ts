// File: GateManager.ts
import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, v3, CCInteger } from 'cc';
import { CoinGateController } from './CoinGateController';
import { UIManager } from './UIManager';

const { ccclass, property } = _decorator;

// Lớp dùng cho CÁCH 1
@ccclass('TowerHeroSet')
export class TowerHeroSet {
    @property(Prefab)
    towerPrefab: Prefab = null!;

    @property([Prefab])
    heroPrefabs: Prefab[] = [];
}

@ccclass('GateManager')
export class GateManager extends Component {
    public static instance: GateManager = null!;

    // --- CÁC THUỘC TÍNH CHUNG ---
    @property(Prefab) public gatePrefab: Prefab = null!;
    @property([Node]) public spawnPoints: Node[] = [];
    @property([CCInteger]) public gateCosts: number[] = [3, 50, 60];
    @property({ type: [Prefab], tooltip: "[CÁCH 2] Danh sách các Prefab Trụ." })
    public towerPrefabs: Prefab[] = [];

    @property({ type: [Prefab], tooltip: "[CÁCH 2] DANH SÁCH TỔNG của tất cả Hero Prefab." })
    public allHeroPrefabs: Prefab[] = [];

    // --- CÁC BIẾN TRẠNG THÁI ---
    private currentSpawnIndex: number = -1;
    private lastSpawnedTower: Node = null;
    private towersBuiltCount: number = 0;

    onLoad() {
        if (GateManager.instance === null) {
            GateManager.instance = this;
        } else {
            this.destroy();
        }
    }

    start() {
        this.spawnNextGate();
    }

    // Hàm này được gọi khi cổng được mở, không thay đổi
    public onGateUnlocked(unlockedPoint: Node) {
        this.spawnTowerAtPoint(unlockedPoint);
        UIManager.instance.showHeroSelectionUI();
    }

    // --- CÁC HÀM XỬ LÝ LOGIC ---

    // CÁCH 1: Kích hoạt Hero đã được spawn sẵn
    public activateHero(heroName: string) {
        console.log("GateManager đang thực thi theo CÁCH 1: activateHero");
        UIManager.instance.hideHeroSelectionUI();

        if (this.lastSpawnedTower) {
            const heroContainer = this.lastSpawnedTower.getChildByName("heroContainer");
            if (heroContainer) {
                const heroToActivate = heroContainer.getChildByName(heroName);
                if (heroToActivate) {
                    heroToActivate.active = true;
                } else {
                    console.error(`CÁCH 1 Lỗi: Không tìm thấy Hero có tên '${heroName}'`);
                }
            }
        }
        this.processNextStep();
    }

    // CÁCH 2: Tìm Prefab và spawn Hero ngay khi được gọi
    public spawnHeroByName(heroName: string) {
        console.log("GateManager đang thực thi theo CÁCH 2: spawnHeroByName");
        UIManager.instance.hideHeroSelectionUI();

        if (!this.lastSpawnedTower) {
            console.error("CÁCH 2 Lỗi: Không có trụ để đặt Hero lên!");
            return;
        }

        const heroPrefab = this.allHeroPrefabs.find(p => p.name === heroName);
        if (heroPrefab) {
            const mountPoint = this.lastSpawnedTower.getChildByName("heroMountPoint");
            if (mountPoint) {
                mountPoint.removeAllChildren();
                const heroNode = instantiate(heroPrefab);
                mountPoint.addChild(heroNode);
            } else {
                console.error(`CÁCH 2 Lỗi: Không tìm thấy 'heroMountPoint' trên trụ!`);
            }
        } else {
            console.error(`CÁCH 2 Lỗi: Không tìm thấy Prefab Hero tên '${heroName}'!`);
        }
        this.processNextStep();
    }

    // Tách logic xử lý bước tiếp theo ra hàm riêng
    private processNextStep() {
        this.towersBuiltCount++;
        if (this.towersBuiltCount >= 3) {
            UIManager.instance.showNextLevelScreen();
        } else {
            this.scheduleOnce(() => { this.spawnNextGate(); }, 1.0);
        }
    }

    // Hàm spawn trụ - Bạn chọn 1 trong 2 cách dưới đây bằng cách bỏ comment
    private spawnTowerAtPoint(point: Node) {
        const pointIndex = this.spawnPoints.indexOf(point);

        // === BẠN CHỌN 1 TRONG 2 CÁCH DƯỚI ĐÂY ===

        // CÁCH 2 (ĐANG KÍCH HOẠT): Chỉ spawn trụ
        const towerPrefabToSpawn = this.towerPrefabs[pointIndex];
        if (!towerPrefabToSpawn) return;
        const tower = instantiate(towerPrefabToSpawn);
        this.node.addChild(tower);
        tower.setWorldPosition(point.worldPosition);
        tower.scale = v3(0, 0, 0);
        tween(tower).to(0.5, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
        this.lastSpawnedTower = tower;

    }

    private spawnNextGate() {
        this.currentSpawnIndex++;
        if (this.currentSpawnIndex >= this.spawnPoints.length) {
            console.log("🎉 Đã xây tất cả các trụ!");
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
}